import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  jobAlerts: 'daily' | 'weekly' | 'never';
  applicationUpdates: boolean;
  marketing: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const EmailPreferencesSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    jobAlerts: {
      type: String,
      enum: ['daily', 'weekly', 'never'],
      default: 'weekly',
      required: true,
    },
    applicationUpdates: {
      type: Boolean,
      default: true,
      required: true,
    },
    marketing: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create index for efficient lookup by userId
EmailPreferencesSchema.index({ userId: 1 });

const EmailPreferences: Model<IEmailPreferences> =
  mongoose.models.EmailPreferences ||
  mongoose.model<IEmailPreferences>('EmailPreferences', EmailPreferencesSchema);

export default EmailPreferences;
