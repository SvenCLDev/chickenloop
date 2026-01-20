import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISavedSearch extends Document {
  userId: mongoose.Types.ObjectId;
  name?: string;
  keyword?: string;
  location?: string;
  country?: string;
  category?: string; // occupationalAreas
  sport?: string; // sports
  language?: string; // languages
  frequency: 'daily' | 'weekly' | 'never';
  active: boolean;
  lastSent?: Date;
  lastHeartbeatSent?: Date; // Timestamp of last heartbeat email sent
  createdAt: Date;
  updatedAt: Date;
}

const SavedSearchSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    keyword: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    sport: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'never'],
      default: 'daily',
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
    lastSent: {
      type: Date,
    },
    lastHeartbeatSent: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
SavedSearchSchema.index({ userId: 1, active: 1 });
SavedSearchSchema.index({ active: 1, frequency: 1, lastSent: 1 });

const SavedSearch: Model<ISavedSearch> =
  mongoose.models.SavedSearch || mongoose.model<ISavedSearch>('SavedSearch', SavedSearchSchema);

export default SavedSearch;

