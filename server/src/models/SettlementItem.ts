import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISettlementItem extends Document {
  settlementId: Types.ObjectId;
  projectId: Types.ObjectId;
  employeeId: Types.ObjectId;
  earnedAmount: Types.Decimal128;
  description?: string;
  createdAt: Date;
}

const SettlementItemSchema = new Schema<ISettlementItem>(
  {
    settlementId: { type: Schema.Types.ObjectId, ref: 'Settlement', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    earnedAmount: { type: Schema.Types.Decimal128, required: true },
    description: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SettlementItem = mongoose.model<ISettlementItem>(
  'SettlementItem',
  SettlementItemSchema
);
