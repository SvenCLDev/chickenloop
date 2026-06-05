import mongoose, { Schema, Document, Model } from 'mongoose';

export const EXPERIMENT_TYPES = ['marketing_banner', 'other'] as const;
export type ExperimentType = (typeof EXPERIMENT_TYPES)[number];

export const EXPERIMENT_STATUSES = ['active', 'paused', 'archived'] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

/** How analytics and waitlist data are resolved for this experiment */
export const EXPERIMENT_DATA_PROFILES = ['equipment_tracking', 'generic'] as const;
export type ExperimentDataProfile = (typeof EXPERIMENT_DATA_PROFILES)[number];

export interface IExperiment extends Document {
  key: string;
  name: string;
  description?: string;
  type: ExperimentType;
  status: ExperimentStatus;
  landingPath?: string;
  dataProfile: ExperimentDataProfile;
  /** Analytics event names stored for this experiment (e.g. equipment_banner_view) */
  analyticsEvents: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ExperimentSchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: EXPERIMENT_TYPES,
      default: 'marketing_banner',
    },
    status: {
      type: String,
      enum: EXPERIMENT_STATUSES,
      default: 'active',
    },
    landingPath: {
      type: String,
      trim: true,
    },
    dataProfile: {
      type: String,
      enum: EXPERIMENT_DATA_PROFILES,
      default: 'generic',
    },
    analyticsEvents: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'experiments',
  }
);

ExperimentSchema.index({ status: 1 });

const Experiment: Model<IExperiment> =
  (mongoose.models.Experiment as Model<IExperiment>) ||
  mongoose.model<IExperiment>('Experiment', ExperimentSchema);

export default Experiment;
