import mongoose, { Document, Schema, Types } from 'mongoose';

export type VendorPaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';

/** Money we actually paid to a vendor. */
export interface IVendorPayment extends Document {
  vendorId: Types.ObjectId;
  vendorWorkId?: Types.ObjectId;
  amount: Types.Decimal128;
  paymentDate: Date;
  paymentMethod: VendorPaymentMethod;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorPaymentSchema = new Schema<IVendorPayment>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    vendorWorkId: { type: Schema.Types.ObjectId, ref: 'VendorWork' },
    amount: { type: Schema.Types.Decimal128, required: true },
    paymentDate: { type: Date, default: Date.now, index: true },
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

export const VendorPayment = mongoose.model<IVendorPayment>('VendorPayment', VendorPaymentSchema);
