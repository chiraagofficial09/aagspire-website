import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IClient extends Document {
  clientCode: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstNumber?: string;
  industry?: string;
  source?: string;
  notes?: string;
  lastInvoiceNumber?: string;
  status: 'active' | 'inactive';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    clientCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String },
    gstNumber: { type: String, trim: true, uppercase: true },
    industry: { type: String, trim: true },
    source: { type: String, trim: true },
    notes: { type: String },
    lastInvoiceNumber: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Client = mongoose.model<IClient>('Client', ClientSchema);
