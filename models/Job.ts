import mongoose, { Schema, Document, Model } from 'mongoose';
import { EmploymentType, SpamFlag, WorkArea } from '@/lib/domainTypes';

export interface IJob extends Document {
  title: string;
  description: string;

  recruiter: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;

  city: string;
  country?: string | null;

  salary?: string;
  type: EmploymentType;

  languages?: string[];
  qualifications?: string[];
  occupationalAreas?: WorkArea[];

  pictures?: string[];

  spam?: SpamFlag;
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
      enum: Object.values(EmploymentType),
      required: true,
    },

    languages: [String],
    qualifications: [String],
    occupationalAreas: [String],

    pictures: [String],

    spam: {
      type: String,
      enum: Object.values(SpamFlag),
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
