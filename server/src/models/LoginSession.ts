import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILoginSession extends Document {
  userId: Types.ObjectId;
  loginAt: Date;
  logoutAt?: Date;
  lastActivityAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  operatingSystem?: string;
  status: 'active' | 'logged_out' | 'expired';
  createdAt: Date;
}

const LoginSessionSchema = new Schema<ILoginSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    loginAt: { type: Date, default: Date.now, index: true },
    logoutAt: { type: Date },
    lastActivityAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    browser: { type: String },
    operatingSystem: { type: String },
    status: {
      type: String,
      enum: ['active', 'logged_out', 'expired'],
      default: 'active',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LoginSession = mongoose.model<ILoginSession>('LoginSession', LoginSessionSchema);
