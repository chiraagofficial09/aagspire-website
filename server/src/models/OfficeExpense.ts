import mongoose, { Document, Schema, Types } from 'mongoose';

export type ExpensePaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';

export interface IOfficeExpense extends Document {
  title: string;
  amount: Types.Decimal128;
  expenseDate: Date;
  paymentMethod: ExpensePaymentMethod;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OfficeExpenseSchema = new Schema<IOfficeExpense>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    expenseDate: { type: Date, default: Date.now, index: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'],
      default: 'cash',
    },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

OfficeExpenseSchema.index({ expenseDate: -1, createdAt: -1 });

export const OfficeExpense = mongoose.model<IOfficeExpense>('OfficeExpense', OfficeExpenseSchema);
