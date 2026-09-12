import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICommissionHistory extends Document {
  projectId: Types.ObjectId;
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
  changedBy: Types.ObjectId;
  reason?: string;
  changedAt: Date;
}

const CommissionHistorySchema = new Schema<ICommissionHistory>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    oldValues: { type: Schema.Types.Mixed, required: true },
    newValues: { type: Schema.Types.Mixed, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const CommissionHistory = mongoose.model<ICommissionHistory>(
  'CommissionHistory',
  CommissionHistorySchema
);
