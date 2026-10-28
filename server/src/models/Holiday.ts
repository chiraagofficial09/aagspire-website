import mongoose, { Document, Schema } from 'mongoose';

export function isValidHolidayDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export interface IHoliday extends Document {
  date: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Calendar metadata only: holidays never create or change attendance records.
const HolidaySchema = new Schema<IHoliday>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      validate: { validator: isValidHolidayDate, message: 'Use a valid date in YYYY-MM-DD format.' },
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { timestamps: true }
);

export const Holiday = mongoose.model<IHoliday>('Holiday', HolidaySchema);
