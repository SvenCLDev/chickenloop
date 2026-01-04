import mongoose, { Schema, Document, Model } from 'mongoose';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';

export interface IJob extends Document {
  title: string;
  description: string;
  company: string;
  location: string;
  country?: string | null;
  salary?: string;
  type: 'full-time' | 'part-time' | 'contract' | 'freelance';
  recruiter: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  languages?: string[];
  qualifications?: string[];
  sports?: string[];
  occupationalAreas?: string[];
  pictures?: string[];
  spam?: 'yes' | 'no';
  published?: boolean;
  featured?: boolean;
  visitCount?: number;
  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: null,
    },
    salary: {
      type: String,
    },
    type: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'freelance'],
      required: true,
    },
    recruiter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    languages: [{
      type: String,
    }],
    qualifications: [{
      type: String,
    }],
    sports: [{
      type: String,
    }],
    occupationalAreas: [{
      type: String,
      enum: [...JOB_CATEGORIES],
    }],
    pictures: [{
      type: String,
    }],
    spam: {
      type: String,
      enum: ['yes', 'no'],
    },
    published: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    visitCount: {
      type: Number,
      default: 0,
    },
    applyByEmail: {
      type: Boolean,
      default: false,
    },
    applyByWebsite: {
      type: Boolean,
      default: false,
    },
    applyByWhatsApp: {
      type: Boolean,
      default: false,
    },
    applicationEmail: {
      type: String,
    },
    applicationWebsite: {
      type: String,
    },
    applicationWhatsApp: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
JobSchema.index({ createdAt: -1 }); // For sorting by creation date
JobSchema.index({ updatedAt: -1 }); // For sorting by update date
JobSchema.index({ published: 1, createdAt: -1 }); // Compound index for published jobs sorted by date
JobSchema.index({ featured: 1, published: 1 }); // For featured published jobs
JobSchema.index({ recruiter: 1 }); // For recruiter's job queries
JobSchema.index({ companyId: 1 }); // For company-specific job queries
JobSchema.index({ country: 1 }); // For country-based filtering (semantic location search)
JobSchema.index({ location: 1 }); // For city-based filtering (semantic location search and exact city filter)
JobSchema.index({ type: 1 }); // For job type filtering

const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;
