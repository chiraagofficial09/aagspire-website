import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProjectCommission extends Document {
  projectId: Types.ObjectId;
  brokerPercent: number;
  employeePercent: number;
  officePercent: number;
  adminPercent: number;
  settlementPercent: number;
  brokerAmount: Types.Decimal128;
  employeeAmount: Types.Decimal128;
  officeAmount: Types.Decimal128;
  adminAmount: Types.Decimal128;
  settlementAmount: Types.Decimal128;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectCommissionSchema = new Schema<IProjectCommission>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true, index: true },
    brokerPercent: { type: Number, required: true, min: 0, max: 100 },
    employeePercent: { type: Number, required: true, min: 0, max: 100 },
    officePercent: { type: Number, required: true, min: 0, max: 100 },
    adminPercent: { type: Number, required: true, min: 0, max: 100 },
    settlementPercent: { type: Number, required: true, min: 0, max: 100 },
    brokerAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
    employeeAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
    officeAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
    adminAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
    settlementAmount: { type: Schema.Types.Decimal128, required: true, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const ProjectCommission = mongoose.model<IProjectCommission>(
  'ProjectCommission',
  ProjectCommissionSchema
);
