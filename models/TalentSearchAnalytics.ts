import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export const TALENT_SEARCH_ANALYTICS_EVENTS = [
  'talent_search',
  'talent_search_page',
  'talent_profile_view',
] as const;

export type TalentSearchAnalyticsEvent = (typeof TALENT_SEARCH_ANALYTICS_EVENTS)[number];

export const TALENT_SEARCH_ANALYTICS_ROLES = ['recruiter', 'admin'] as const;
export type TalentSearchAnalyticsRole = (typeof TALENT_SEARCH_ANALYTICS_ROLES)[number];

export interface ITalentSearchAnalytics extends Document {
  event: TalentSearchAnalyticsEvent;
  recruiterId: Types.ObjectId;
  role: TalentSearchAnalyticsRole;
  filters?: Record<string, unknown>;
  activeFilterKeys?: string[];
  resultCount?: number | null;
  candidateId?: Types.ObjectId | null;
  createdAt: Date;
}

const TalentSearchAnalyticsSchema: Schema = new Schema(
  {
    event: {
      type: String,
      enum: TALENT_SEARCH_ANALYTICS_EVENTS,
      required: true,
      index: true,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: TALENT_SEARCH_ANALYTICS_ROLES,
      required: true,
      index: true,
    },
    filters: {
      type: Schema.Types.Mixed,
    },
    activeFilterKeys: {
      type: [String],
      default: [],
    },
    resultCount: {
      type: Number,
      default: null,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'CV',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'talentSearchAnalytics',
  }
);

TalentSearchAnalyticsSchema.index({ createdAt: -1 });
TalentSearchAnalyticsSchema.index({ event: 1, role: 1, createdAt: -1 });
TalentSearchAnalyticsSchema.index({ recruiterId: 1, createdAt: -1 });

const TalentSearchAnalytics: Model<ITalentSearchAnalytics> =
  (mongoose.models.TalentSearchAnalytics as Model<ITalentSearchAnalytics>) ||
  mongoose.model<ITalentSearchAnalytics>('TalentSearchAnalytics', TalentSearchAnalyticsSchema);

export default TalentSearchAnalytics;
