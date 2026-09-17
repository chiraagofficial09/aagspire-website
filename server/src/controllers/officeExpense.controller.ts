import { Response } from 'express';
import { Types } from 'mongoose';
import { OfficeExpense } from '../models/OfficeExpense.js';
import { toDecimal, fromDecimal, round2 } from '../utils/decimalHelper.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getMonthDateRange } from '../utils/dateHelper.js';
import { logAudit } from '../services/audit.service.js';

export async function listOfficeExpenses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { month, search } = req.query;
    const filter: any = {};

    const monthRange = getMonthDateRange(month as string);
    if (monthRange) {
      const { startOfMonth, endOfMonth } = monthRange;
      filter.expenseDate = { $gte: startOfMonth, $lte: endOfMonth };
    }

    if (search) {
      filter.title = { $regex: String(search).trim(), $options: 'i' };
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
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return OfficeExpense.aggregate([
          {
            $match: {
              expenseDate: { $gte: startOfMonth, $lte: endOfMonth },
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
              $dateToString: { format: '%Y-%m', date: '$expenseDate' },
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

    if (!title || !String(title).trim()) {
      res.status(400).json({ success: false, message: 'Expense title/name is required' });
      return;
    }

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
      return;
    }

    const dateVal = expenseDate ? new Date(expenseDate) : new Date();

    const expense = await OfficeExpense.create({
      title: String(title).trim(),
      amount: toDecimal(numAmount),
      expenseDate: isNaN(dateVal.getTime()) ? new Date() : dateVal,
      paymentMethod: paymentMethod || 'cash',
      notes: notes ? String(notes).trim() : undefined,
      createdBy: req.user!._id,
    });

    await logAudit({
      userId: req.user!._id,
      action: 'CREATE_OFFICE_EXPENSE',
      entityType: 'OfficeExpense',
      entityId: expense._id,
      newValue: { title: expense.title, amount: numAmount },
    });

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

    const expense = await OfficeExpense.findById(id);
    if (!expense) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    if (title !== undefined) expense.title = String(title).trim();
    if (amount !== undefined) {
      const numAmount = parseFloat(String(amount));
      if (isNaN(numAmount) || numAmount <= 0) {
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
      newValue: { title: expense.title, amount: fromDecimal(expense.amount) },
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
