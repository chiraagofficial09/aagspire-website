import { Response } from 'express';
import { PipelineStage } from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ClientPayment } from '../models/ClientPayment.js';
import { OfficeExpense } from '../models/OfficeExpense.js';
import { buildCashBankSummary, financeMonth, financeMonthRange, FINANCE_TIMEZONE, FinanceRow } from '../services/cashBankBalance.js';

export function financePipeline(dateField: string, end?: Date): PipelineStage[] {
  return [
    { $project: { amount: 1, paymentMethod: 1, effectiveDate: { $ifNull: [`$${dateField}`, '$createdAt'] } } },
    ...(end ? [{ $match: { effectiveDate: { $lt: end } } }] : []),
    { $group: {
      _id: { month: { $dateToString: { format: '%Y-%m', date: '$effectiveDate', timezone: FINANCE_TIMEZONE } }, method: '$paymentMethod' },
      amount: { $sum: '$amount' }, count: { $sum: 1 },
    } },
    { $project: { _id: 0, month: '$_id.month', method: '$_id.method', amount: { $toString: '$amount' }, count: 1 } },
  ];
}

export async function getCashBankSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const month = req.query?.month ?? financeMonth();
    let end: Date | undefined;
    try {
      if (typeof month !== 'string') throw new Error('Invalid month');
      if (month !== 'all') end = financeMonthRange(month).end;
    } catch {
      res.status(400).json({ success: false, message: 'Invalid month; use YYYY-MM or all' });
      return;
    }
    const [payments, expenses] = await Promise.all([
      ClientPayment.aggregate<FinanceRow>(financePipeline('paymentDate', end)),
      OfficeExpense.aggregate<FinanceRow>(financePipeline('expenseDate', end)),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: buildCashBankSummary(payments, expenses, month as string) });
  } catch (error: unknown) {
    res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Unable to calculate balances' });
  }
}
