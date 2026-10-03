import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  clientId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  html: { type: String, required: true },
  fileName: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
export const InvoicePreview = mongoose.model('InvoicePreview', schema);
