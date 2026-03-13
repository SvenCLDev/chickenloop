import mongoose, { Schema, Document, Model } from 'mongoose';
import { OFFERED_ACTIVITIES_LIST } from '@/lib/offeredActivities';
import { JOB_CATEGORY_VALUES, type JobCategory } from '@/lib/jobCategories';

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contract',
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
  'hospitality',
  'sales',
  'management',
  'marketing',
  'other',
] as const;

export const EXPERIENCE_LEVELS = [
  'internship',
  'junior',
  'senior',
  'expert',
  'manager',
] as const;

export interface IJob extends Document {
  title: string;
  description: string;

  recruiter: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;

  city: string;
  country?: string | null;

  /** Geocoded from city + country for map display (e.g. /map). When set, map uses this instead of country centroid. */
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;

  salary?: string;
  type: (typeof EMPLOYMENT_TYPES)[number];
  experienceLevel?: (typeof EXPERIENCE_LEVELS)[number];
  /** Experience level (alias for experienceLevel, used by Drupal migration) */
  experience?: (typeof EXPERIENCE_LEVELS)[number];

  languages?: string[];
  qualifications?: string[];
  occupationalAreas?: JobCategory[];
  sports?: (typeof OFFERED_ACTIVITIES_LIST)[number][];

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
  applicationOptions?: {
    ats?: boolean;
    email?: boolean;
    website?: boolean;
    whatsapp?: boolean;
  };

  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;

  datePosted?: Date;

  legacySlug?: string;

  /** Instagram post ID after publishing job to Instagram */
  instagramPostId?: string | null;
  /** When the job was posted to Instagram */
  instagramPostedAt?: Date | null;

  /**
   * Last time the recruiter made a contextual edit to the job (title, description, etc.).
   * Used for listing order; not updated by system actions (featured toggle, visit count, Instagram post, etc.).
   */
  lastRecruiterEditAt?: Date | null;

  // 🔹 Legacy / migration metadata
  legacy?: {
    source: 'drupal7' | 'drupal';
    jobNodeId?: number;
    drupalNid?: string | number;
    legacySlug?: string;
    authorUserId?: number;
    originalCompanyText?: string;
    workflowState?: string;
    migratedAt?: Date;
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

    coordinates: {
      latitude: Number,
      longitude: Number,
    },

    salary: String,
    type: {
      type: String,
      enum: EMPLOYMENT_TYPES,
      required: true,
    },
    experienceLevel: {
      type: String,
      enum: EXPERIENCE_LEVELS,
    },
    /** Experience level (alias for experienceLevel, used by Drupal migration) */
    experience: {
      type: String,
      enum: EXPERIENCE_LEVELS,
    },

    languages: [String],
    qualifications: [String],
    occupationalAreas: {
      type: [String],
      enum: JOB_CATEGORY_VALUES,
      default: [],
    },
    sports: {
      type: [String],
      enum: OFFERED_ACTIVITIES_LIST,
      default: [],
    },

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

    legacySlug: {
      type: String,
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
    applicationOptions: {
      ats: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      website: { type: Boolean, default: false },
      whatsapp: { type: Boolean, default: false },
    },

    applicationEmail: String,
    applicationWebsite: String,
    applicationWhatsApp: String,

    datePosted: Date,

    instagramPostId: {
      type: String,
      default: null,
    },
    instagramPostedAt: {
      type: Date,
      default: null,
    },

    lastRecruiterEditAt: {
      type: Date,
      default: null,
    },

    // 🔹 Legacy / migration
    legacy: {
      source: {
        type: String,
        enum: ['drupal7', 'drupal'],
      },
      jobNodeId: Number,
      drupalNid: Schema.Types.Mixed,
      legacySlug: String,
      authorUserId: Number,
      originalCompanyText: String,
      workflowState: String,
      migratedAt: Date,
    },
  },
  { timestamps: true }
);

// Indexes
JobSchema.index({ createdAt: -1 });
JobSchema.index({ lastRecruiterEditAt: -1 });
JobSchema.index({ featured: 1 });
JobSchema.index({ featuredUntil: 1 });
JobSchema.index({ 'legacy.legacySlug': 1 });

const Job =
  (mongoose.models.Job as Model<IJob>) ||
  mongoose.model<IJob>('Job', JobSchema);

export default Job;
