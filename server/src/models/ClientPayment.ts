import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'cheque' | 'other';

export interface IClientPayment extends Document {
  projectId?: Types.ObjectId;
  clientId: Types.ObjectId;
  amount: Types.Decimal128;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientPaymentSchema = new Schema<IClientPayment>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: false, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'cash', 'cheque', 'other'],
      default: 'bank_transfer',
    },
    transactionReference: { type: String, trim: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ClientPaymentSchema.index({ projectId: 1, paymentDate: -1 });
ClientPaymentSchema.index({ clientId: 1, paymentDate: -1 });
ClientPaymentSchema.index({ paymentDate: -1, createdAt: -1 });

export const ClientPayment = mongoose.model<IClientPayment>('ClientPayment', ClientPaymentSchema);
