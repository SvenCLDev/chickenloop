import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReferenceVerificationToken extends Document {
  cvId: mongoose.Types.ObjectId;
  experienceEntryId: string;
  managerEmail: string;
  token: string;
  candidateName: string;
  schoolName: string;
  seasonLabel?: string;
  expiresAt: Date;
  respondedAt?: Date;
  confirmed?: boolean;
  rehire?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReferenceVerificationTokenSchema = new Schema(
  {
    cvId: { type: Schema.Types.ObjectId, ref: 'CV', required: true, index: true },
    experienceEntryId: { type: String, required: true, index: true },
    managerEmail: { type: String, required: true },
    token: { type: String, required: true, unique: true, index: true },
    candidateName: { type: String, required: true },
    schoolName: { type: String, required: true },
    seasonLabel: String,
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: Date,
    confirmed: Boolean,
    rehire: Boolean,
  },
  { timestamps: true }
);

const ReferenceVerificationToken =
  (mongoose.models.ReferenceVerificationToken as Model<IReferenceVerificationToken>) ||
  mongoose.model<IReferenceVerificationToken>(
    'ReferenceVerificationToken',
    ReferenceVerificationTokenSchema
  );

export default ReferenceVerificationToken;
