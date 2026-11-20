import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CandidateSearchParams } from '@/lib/candidateSearchParams';

export type TalentAlertFrequency = 'immediate' | 'daily' | 'weekly' | 'never';

export interface ITalentSavedSearch extends Document {
  recruiterId: mongoose.Types.ObjectId;
  name: string;
  filters: CandidateSearchParams;
  frequency: TalentAlertFrequency;
  active: boolean;
  baselineAt: Date;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TalentSavedSearchSchema: Schema = new Schema(
  {
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    frequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'never'],
      default: 'daily',
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
    baselineAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    lastSentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

TalentSavedSearchSchema.index({ recruiterId: 1, active: 1 });
TalentSavedSearchSchema.index({ active: 1, frequency: 1, lastSentAt: 1 });
TalentSavedSearchSchema.index({ active: 1, frequency: 1 });

const TalentSavedSearch: Model<ITalentSavedSearch> =
  mongoose.models.TalentSavedSearch ||
  mongoose.model<ITalentSavedSearch>('TalentSavedSearch', TalentSavedSearchSchema);

export default TalentSavedSearch;
