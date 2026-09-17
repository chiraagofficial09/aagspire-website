import { Types } from 'mongoose';
import { Notification } from '../models/Notification.js';

export interface CreateNotificationParams {
  recipient?: string | Types.ObjectId;
  role?: 'admin' | 'employee' | 'all';
  type?: 'work_log' | 'project' | 'payment' | 'settlement' | 'employee' | 'client' | 'attendance' | 'system';
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const recipientId = params.recipient ? new Types.ObjectId(params.recipient.toString()) : undefined;
    let role = params.role;

    if (recipientId) {
      // Direct personal notification: MUST be addressed to the specific user and never role='all'
      if (!role || role === 'all') {
        role = 'employee';
      }
    } else {
      // Broadcast / role notification without a specific recipient
      if (!role) {
        role = 'all';
      }
    }

    await Notification.create({
      recipient: recipientId,
      role,
      type: params.type || 'system',
      title: params.title,
      message: params.message,
      link: params.link,
      metadata: params.metadata,
      isRead: false,
    });
  } catch (error) {
    console.error('[Notification Service Error]:', error);
  }
}
