import mongoose, { Document, Schema, Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave';

export interface IAttendance extends Document {
  employeeId: Types.ObjectId;
  date: Date;
  clockInAt?: Date;
  clockOutAt?: Date;
  totalMinutes?: number;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: Date, required: true, index: true },
    clockInAt: { type: Date },
    clockOutAt: { type: Date },
    totalMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half_day', 'leave'],
      default: 'present',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
