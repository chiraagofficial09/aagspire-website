import mongoose, { Document, Schema, Types } from 'mongoose';

export type ProjectStatus =
  | 'lead'
  | 'confirmed'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'delivered'
  | 'cancelled';

export interface IProject extends Document {
  projectCode: string;
  clientId: Types.ObjectId;
  projectName: string;
  description?: string;
  projectValue: Types.Decimal128;
  discountPercent?: number;
  discountAmount?: Types.Decimal128;
  startDate?: Date;
  deadline?: Date;
  status: ProjectStatus;
  assignedEmployees: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    projectName: { type: String, required: true, trim: true },
    description: { type: String },
    projectValue: { type: Schema.Types.Decimal128, required: true, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Schema.Types.Decimal128, default: 0 },
    startDate: { type: Date },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['lead', 'confirmed', 'in_progress', 'review', 'completed', 'delivered', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    assignedEmployees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ assignedEmployees: 1 });
ProjectSchema.index({ clientId: 1, status: 1 });
ProjectSchema.index({ status: 1, createdAt: -1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
