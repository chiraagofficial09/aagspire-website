import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IEmployee extends Document {
  userId: Types.ObjectId;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  designation?: string;
  department?: string;
  joiningDate: Date;
  defaultCommissionPercent?: number;
  profileImage?: string;
  address?: string;
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
  };
  upiId?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    employeeCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true, default: 'Design Specialist' },
    department: { type: String, trim: true, default: 'Creative & Branding' },
    joiningDate: { type: Date, default: Date.now },
    defaultCommissionPercent: { type: Number, default: 40, min: 0, max: 100 },
    profileImage: { type: String },
    address: { type: String },
    bankDetails: {
      accountHolderName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      bankName: { type: String, trim: true },
      ifscCode: { type: String, trim: true, uppercase: true },
    },
    upiId: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
