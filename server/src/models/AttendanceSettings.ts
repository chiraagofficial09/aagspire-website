import mongoose, { Schema } from 'mongoose';

export interface IAttendanceSettings {
  _id: string;
  autoClockOutEnabled: boolean;
  autoClockOutTime: string; // "HH:mm" in IST
}

const AttendanceSettingsSchema = new Schema<IAttendanceSettings>({
  _id: { type: String, default: 'default' },
  autoClockOutEnabled: { type: Boolean, default: false },
  autoClockOutTime: { type: String, default: '19:00' },
}, { timestamps: true });

export const AttendanceSettings = mongoose.model<IAttendanceSettings>('AttendanceSettings', AttendanceSettingsSchema);
