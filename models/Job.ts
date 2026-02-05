import mongoose, { Schema, Document, Model } from 'mongoose';

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'freelance',
  'internship',
  'project',
  'other',
] as const;

export const SPAM_FLAGS = [
  'clean',
  'suspected',
  'confirmed',
] as const;

export const WORK_AREAS = [
  'instructor',
  'customer_support',
  'sales',
  'hospitality',
  'marketing',
  'it',
  'management',
  'operations',
  'other',
] as const;

export interface IJob extends Document {
  title: string;
  description: string;

  recruiter: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;

  city: string;
  country?: string | null;

  salary?: string;
  type: (typeof EMPLOYMENT_TYPES)[number];

  languages?: string[];
  qualifications?: string[];
  occupationalAreas?: (typeof WORK_AREAS)[number][];

  pictures?: string[];

  spam?: (typeof SPAM_FLAGS)[number];
  published?: boolean;
  featured?: boolean;
  featuredUntil?: Date | null;

  visitCount?: number;

  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applyViaATS?: boolean;

  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;

  datePosted?: Date;

  // 🔹 Legacy / migration metadata
  legacy?: {
    source: 'drupal7';
    jobNodeId: number;
    authorUserId: number;
    originalCompanyText?: string;
    workflowState?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },

    recruiter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: null,
    },

    salary: String,
    type: {
      type: String,
      enum: EMPLOYMENT_TYPES,
      required: true,
    },

    languages: [String],
    qualifications: [String],
    occupationalAreas: [String],

    pictures: [String],

    spam: {
      type: String,
      enum: SPAM_FLAGS,
    },

    published: {
      type: Boolean,
      default: false,
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: {
      type: Date,
      default: null,
    },

    visitCount: {
      type: Number,
      default: 0,
    },

    applyByEmail: Boolean,
    applyByWebsite: Boolean,
    applyByWhatsApp: Boolean,
    applyViaATS: Boolean,

    applicationEmail: String,
    applicationWebsite: String,
    applicationWhatsApp: String,

    datePosted: Date,

    // 🔹 Legacy / migration
    legacy: {
      source: {
        type: String,
        enum: ['drupal7'],
      },
      jobNodeId: Number,
      authorUserId: Number,
      originalCompanyText: String,
      workflowState: String,
    },
  },
  { timestamps: true }
);

// Indexes
JobSchema.index({ createdAt: -1 });
JobSchema.index({ featured: 1 });
JobSchema.index({ featuredUntil: 1 });

const Job =
  (mongoose.models.Job as Model<IJob>) ||
  mongoose.model<IJob>('Job', JobSchema);

export default Job;
