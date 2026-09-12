import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReceipt extends Document {
  receiptCode: string;
  settlementId: Types.ObjectId;
  employeeId: Types.ObjectId;
  receiptData: Record<string, any>;
  pdfUrl?: string;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    receiptCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    settlementId: { type: Schema.Types.ObjectId, ref: 'Settlement', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    receiptData: { type: Schema.Types.Mixed, required: true },
    pdfUrl: { type: String },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Receipt = mongoose.model<IReceipt>('Receipt', ReceiptSchema);
