import mongoose, { Document, Schema, Types } from 'mongoose';

export type WorkLogStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'changes_requested';

export interface IWorkLog extends Document {
  employeeId: Types.ObjectId;
  projectId?: Types.ObjectId;
  workDate: Date;
  taskName: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  totalMinutes?: number;
  status: WorkLogStatus;
  adminComment?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkLogSchema = new Schema<IWorkLog>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: false, index: true },
    workDate: { type: Date, default: Date.now, index: true },
    taskName: { type: String, required: true, trim: true },
    description: { type: String },
    startTime: { type: Date },
    endTime: { type: Date },
    totalMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'changes_requested'],
      default: 'submitted',
      index: true,
    },
    adminComment: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const WorkLog = mongoose.model<IWorkLog>('WorkLog', WorkLogSchema);
