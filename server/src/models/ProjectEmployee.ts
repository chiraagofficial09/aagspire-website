import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProjectEmployee extends Document {
  projectId: Types.ObjectId;
  employeeId: Types.ObjectId;
  sharePercent: number;
  sharePercentage?: number;
  roleInProject?: string;
  allocatedCommission: Types.Decimal128;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectEmployeeSchema = new Schema<IProjectEmployee>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    sharePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 100,
    },
    sharePercentage: { type: Number, min: 0, max: 100, default: 100 },
    roleInProject: { type: String, default: 'Creator' },
    allocatedCommission: { type: Schema.Types.Decimal128, required: true, default: 0 },
  },
  { timestamps: true }
);

ProjectEmployeeSchema.index({ projectId: 1, employeeId: 1 }, { unique: true });

export const ProjectEmployee = mongoose.model<IProjectEmployee>(
  'ProjectEmployee',
  ProjectEmployeeSchema
);
