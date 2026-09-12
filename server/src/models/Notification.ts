import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  recipient?: Types.ObjectId;
  role: 'admin' | 'employee' | 'all';
  type: 'work_log' | 'project' | 'payment' | 'settlement' | 'employee' | 'client' | 'attendance' | 'system';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    role: {
      type: String,
      enum: ['admin', 'employee', 'all'],
      default: 'all',
      index: true,
    },
    type: {
      type: String,
      enum: ['work_log', 'project', 'payment', 'settlement', 'employee', 'client', 'attendance', 'system'],
      default: 'system',
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ role: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
