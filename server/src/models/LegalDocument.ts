import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILegalSection {
  heading: string;
  description: string;
  order: number;
}

export interface ILegalDocument extends Document {
  type: 'terms_and_conditions' | 'privacy_policy';
  title: string;
  subtitle?: string;
  sections: ILegalSection[];
  lastUpdated: Date;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LegalSectionSchema = new Schema<ILegalSection>(
  {
    heading: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const LegalDocumentSchema = new Schema<ILegalDocument>(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      enum: ['terms_and_conditions', 'privacy_policy'],
      index: true,
    },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    sections: {
      type: [LegalSectionSchema],
      default: [],
    },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const LegalDocument = mongoose.model<ILegalDocument>('LegalDocument', LegalDocumentSchema);
