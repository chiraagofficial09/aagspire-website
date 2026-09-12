import mongoose, { Document, Schema } from 'mongoose';

export interface ICommissionPreset extends Document {
  name: string;
  brokerPercent: number;
  employeePercent: number;
  officePercent: number;
  adminPercent: number;
  settlementPercent: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionPresetSchema = new Schema<ICommissionPreset>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    brokerPercent: { type: Number, required: true, default: 10 },
    employeePercent: { type: Number, required: true, default: 40 },
    officePercent: { type: Number, required: true, default: 10 },
    adminPercent: { type: Number, required: true, default: 35 },
    settlementPercent: { type: Number, required: true, default: 5 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CommissionPreset = mongoose.model<ICommissionPreset>(
  'CommissionPreset',
  CommissionPresetSchema
);
