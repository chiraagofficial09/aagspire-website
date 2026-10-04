import { Response } from 'express';
import { Types } from 'mongoose';
import { OfficeExpense } from '../models/OfficeExpense.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { financeMonth, financeMonthRange, validMoney, validFinanceDate } from '../services/cashBankBalance.js';
import { logAudit } from '../services/audit.service.js';
import { appendRowSafely } from '../services/googleSheets.service.js';

export async function listOfficeExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { month, search } = req.query;
    const filter: any = {};

    if (month && month !== 'all') {
      let range;
      try { range = financeMonthRange(String(month)); } catch {
        res.status(400).json({ success: false, message: 'Invalid month; use YYYY-MM' });
        return;
      }
      filter.$expr = { $and: [
        { $gte: [{ $ifNull: ['$expenseDate', '$createdAt'] }, range.start] },
        { $lt: [{ $ifNull: ['$expenseDate', '$createdAt'] }, range.end] },
      ] };
    }

    if (search) {
      filter.title = { $regex: String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const [expenses, allSumResult, thisMonthSumResult, monthlyBreakdownResult] = await Promise.all([
      OfficeExpense.find(filter).sort({ expenseDate: -1, createdAt: -1 }).lean(),
      OfficeExpense.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: '$amount' } },
          },
        },
      ]),
      (() => {
        const now = new Date();
        const { start: startOfMonth, end: endOfMonth } = financeMonthRange(financeMonth(now));
        return OfficeExpense.aggregate([
          {
            $match: {
              expenseDate: { $gte: startOfMonth, $lt: endOfMonth },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $toDouble: '$amount' } },
            },
          },
        ]);
      })(),
      OfficeExpense.aggregate([
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: { $ifNull: ['$expenseDate', '$createdAt'] }, timezone: 'Asia/Kolkata' },
            },
            totalAmount: { $sum: { $toDouble: '$amount' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    ]);

    const overallTotal = round2(allSumResult[0]?.total || 0);
    const thisMonthTotal = round2(thisMonthSumResult[0]?.total || 0);

    const formatted = expenses.map((exp: any) => ({
      ...exp,
      amount: fromDecimal(exp.amount),
    }));

    const filteredTotal = round2(formatted.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0));

    const monthlyBreakdown = (monthlyBreakdownResult || []).map((m: any) => ({
      monthKey: m._id,
      totalAmount: round2(m.totalAmount || 0),
      count: m.count || 0,
    }));

    res.json({
      success: true,
      overallTotal,
      thisMonthTotal,
      filteredTotal,
      monthlyBreakdown,
      count: formatted.length,
      data: formatted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createOfficeExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { title, amount, expenseDate, paymentMethod, notes } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ success: false, message: 'Expense title/name is required' });
      return;
    }

    const numAmount = parseFloat(String(amount));
    if (!validMoney(amount)) {
      res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
      return;
    }

    if (!['bank_transfer', 'cash'].includes(paymentMethod) ||
        (expenseDate !== undefined && !validFinanceDate(expenseDate))) {
      res.status(400).json({ success: false, message: 'Select Bank or Cash and enter a valid expense date' });
      return;
    }
    const dateVal = expenseDate ? new Date(expenseDate) : new Date();

    const expense = await OfficeExpense.create({
      title: String(title).trim(),
      amount: toDecimal(numAmount),
      expenseDate: dateVal,
      paymentMethod,
      notes: notes ? String(notes).trim() : undefined,
      createdBy: req.user!._id,
    });

    await logAudit({
      userId: req.user!._id,
      action: 'CREATE_OFFICE_EXPENSE',
      entityType: 'OfficeExpense',
      entityId: expense._id,
      newValue: { title: expense.title, amount: numAmount, paymentMethod: expense.paymentMethod },
    });

    // Auto-append to Google Sheets (non-blocking)
    appendRowSafely('Office Expenses', [
      dateVal.toLocaleDateString('en-IN'),
      expense.title,
      numAmount,
      (expense.paymentMethod || 'cash').toUpperCase(),
      expense.notes || '',
      String(expense._id),
    ]).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Office expense created successfully',
      data: {
        ...expense.toObject(),
        amount: fromDecimal(expense.amount),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateOfficeExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, amount, expenseDate, paymentMethod, notes } = req.body;

    if (!Types.ObjectId.isValid(id) ||
        (title !== undefined && (typeof title !== 'string' || !title.trim())) ||
        (expenseDate !== undefined && !validFinanceDate(expenseDate)) ||
        (paymentMethod !== undefined && !['cash', 'bank_transfer', 'upi', 'cheque', 'other'].includes(paymentMethod))) {
      res.status(400).json({ success: false, message: 'Invalid expense ID, title, date or payment method' });
      return;
    }
    const expense = await OfficeExpense.findById(id);
    if (!expense) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    if (title !== undefined) expense.title = String(title).trim();
    if (amount !== undefined) {
      const numAmount = parseFloat(String(amount));
      if (!validMoney(amount)) {
        res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
        return;
      }
      expense.amount = toDecimal(numAmount);
    }
    if (expenseDate !== undefined) {
      const dateVal = new Date(expenseDate);
      if (!isNaN(dateVal.getTime())) {
        expense.expenseDate = dateVal;
      }
    }
    if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;
    if (notes !== undefined) expense.notes = String(notes).trim();

    await expense.save();

    await logAudit({
      userId: req.user!._id,
      action: 'UPDATE_OFFICE_EXPENSE',
      entityType: 'OfficeExpense',
      entityId: expense._id,
      newValue: { title: expense.title, amount: fromDecimal(expense.amount), paymentMethod: expense.paymentMethod },
    });

    res.json({
      success: true,
      message: 'Office expense updated successfully',
      data: {
        ...expense.toObject(),
        amount: fromDecimal(expense.amount),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteOfficeExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const expense = await OfficeExpense.findByIdAndDelete(id);
    if (!expense) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    await logAudit({
      userId: req.user!._id,
      action: 'DELETE_OFFICE_EXPENSE',
      entityType: 'OfficeExpense',
      entityId: new Types.ObjectId(id),
      oldValue: { title: expense.title, amount: fromDecimal(expense.amount) },
    });

    res.json({ success: true, message: 'Office expense deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}
