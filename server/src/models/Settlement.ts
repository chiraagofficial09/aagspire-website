import mongoose, { Document, Schema, Types } from 'mongoose';

export type SettlementStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface ISettlement extends Document {
  settlementCode: string;
  employeeId: Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  grossEarned: Types.Decimal128;
  adjustments: Types.Decimal128;
  previouslyPaid: Types.Decimal128;
  finalPayable: Types.Decimal128;
  status: SettlementStatus;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: Date;
  paymentProofUrl?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  paidBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    settlementCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    grossEarned: { type: Schema.Types.Decimal128, required: true, default: 0 },
    adjustments: { type: Schema.Types.Decimal128, required: true, default: 0 },
    previouslyPaid: { type: Schema.Types.Decimal128, required: true, default: 0 },
    finalPayable: { type: Schema.Types.Decimal128, required: true, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'approved', 'paid', 'cancelled'],
      default: 'draft',
      index: true,
    },
    paymentMethod: { type: String },
    paymentReference: { type: String },
    paymentDate: { type: Date },
    paymentProofUrl: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Settlement = mongoose.model<ISettlement>('Settlement', SettlementSchema);
