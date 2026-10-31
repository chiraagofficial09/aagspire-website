import mongoose, { Document, Schema, Types } from 'mongoose';

/** A job a vendor did for us (printing, banners, frames...) that we have to pay for. */
export interface IVendorWork extends Document {
  vendorId: Types.ObjectId;
  title: string;
  description?: string;
  amount: Types.Decimal128;
  workDate: Date;
  // Only used when the vendor is linked to a client: deduct the unpaid amount in the client's bill
  adjustInClientBill: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VendorWorkSchema = new Schema<IVendorWork>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Schema.Types.Decimal128, required: true },
    workDate: { type: Date, default: Date.now, index: true },
    adjustInClientBill: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const VendorWork = mongoose.model<IVendorWork>('VendorWork', VendorWorkSchema);
