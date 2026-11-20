import mongoose, { Schema, Document, Model } from 'mongoose';

export type TalentAlertEventType =
  | 'saved_search_match'
  | 'favourite_became_available';

export type TalentAlertEventStatus =
  | 'pending'
  | 'included_in_digest'
  | 'sent'
  | 'suppressed'
  | 'failed';

export type TalentAlertFrequencyBucket = 'immediate' | 'daily' | 'weekly';

export interface ITalentAlertEvent extends Document {
  recruiterId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  eventType: TalentAlertEventType;
  talentSavedSearchIds: mongoose.Types.ObjectId[];
  previousAvailability?: string;
  newAvailability?: string;
  dedupeKey: string;
  status: TalentAlertEventStatus;
  frequencyBucket: TalentAlertFrequencyBucket;
  emailSentAt?: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const TalentAlertEventSchema: Schema = new Schema(
  {
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'CV',
      required: true,
    },
    eventType: {
      type: String,
      enum: ['saved_search_match', 'favourite_became_available'],
      required: true,
    },
    talentSavedSearchIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TalentSavedSearch',
      },
    ],
    previousAvailability: { type: String },
    newAvailability: { type: String },
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'included_in_digest', 'sent', 'suppressed', 'failed'],
      default: 'pending',
      required: true,
    },
    frequencyBucket: {
      type: String,
      enum: ['immediate', 'daily', 'weekly'],
      required: true,
    },
    emailSentAt: { type: Date },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

TalentAlertEventSchema.index({ status: 1, frequencyBucket: 1, createdAt: 1 });
TalentAlertEventSchema.index({ recruiterId: 1, createdAt: -1 });

const TalentAlertEvent: Model<ITalentAlertEvent> =
  mongoose.models.TalentAlertEvent ||
  mongoose.model<ITalentAlertEvent>('TalentAlertEvent', TalentAlertEventSchema);

export default TalentAlertEvent;
