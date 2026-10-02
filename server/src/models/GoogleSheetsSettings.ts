import mongoose, { Schema } from 'mongoose';

const GoogleSheetsSettingsSchema = new Schema({
  _id: { type: String, default: 'default' },
  spreadsheetId: { type: String, required: true },
  title: { type: String, required: true },
}, { timestamps: true });

export const GoogleSheetsSettings = mongoose.model('GoogleSheetsSettings', GoogleSheetsSettingsSchema);
