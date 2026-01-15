import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICookieConsent extends Document {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CookieConsentSchema: Schema = new Schema(
  {
    necessary: {
      type: Boolean,
      required: true,
      default: true,
    },
    analytics: {
      type: Boolean,
      required: true,
      default: false,
    },
    marketing: {
      type: Boolean,
      required: true,
      default: false,
    },
    functional: {
      type: Boolean,
      required: true,
      default: false,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying by timestamp
CookieConsentSchema.index({ timestamp: -1 });
CookieConsentSchema.index({ createdAt: -1 });

const CookieConsent: Model<ICookieConsent> = 
  mongoose.models.CookieConsent || mongoose.model<ICookieConsent>('CookieConsent', CookieConsentSchema);

export default CookieConsent;









