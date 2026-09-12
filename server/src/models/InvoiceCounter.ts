import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceCounter extends Document {
  key: string;
  currentNumber: number;
  step: number;
  lastIssuedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceCounterSchema = new Schema<IInvoiceCounter>(
  {
    key: { type: String, required: true, unique: true, default: 'client_invoice_sequence' },
    currentNumber: { type: Number, required: true, default: 10 },
    step: { type: Number, required: true, default: 3 },
    lastIssuedAt: { type: Date },
  },
  { timestamps: true }
);

export const InvoiceCounter = mongoose.model<IInvoiceCounter>('InvoiceCounter', InvoiceCounterSchema);
