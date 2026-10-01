import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStaffTerms extends Document {
  content: string;
  lastUpdated: Date;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StaffTermsSchema = new Schema<IStaffTerms>(
  {
    content: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const StaffTerms = mongoose.model<IStaffTerms>('StaffTerms', StaffTermsSchema);
// Keep alias for backwards compatibility
export const CompanyTerm = StaffTerms;
