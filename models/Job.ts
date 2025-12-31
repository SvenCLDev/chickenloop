/**
 * Job listing model for the watersports industry
 * 
 * This model represents job postings in the ChickenLoop platform.
 * Jobs are created by recruiters and can be browsed by job seekers.
 * Each job can be associated with a company and includes details about
 * the position, requirements, and application methods.
 * 
 * @module models/Job
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Job document interface extending Mongoose Document.
 * Represents a job listing in the watersports industry.
 */
export interface IJob extends Document {
  /** Job title/position name */
  title: string;
  
  /** Full job description (can include HTML or markdown) */
  description: string;
  
  /** Company name (string field for legacy compatibility) */
  company: string;
  
  /** Job location (city/region) */
  location: string;
  
  /** Country where the job is located (optional) */
  country?: string | null;
  
  /** Salary range or details (optional, free text) */
  salary?: string;
  
  /** Employment type */
  type: 'full-time' | 'part-time' | 'contract' | 'freelance';
  
  /** Reference to the User (recruiter) who posted this job */
  recruiter: mongoose.Types.ObjectId;
  
  /** Reference to the Company this job belongs to (optional) */
  companyId?: mongoose.Types.ObjectId;
  
  /** Required or preferred languages for the job */
  languages?: string[];
  
  /** Required or preferred qualifications */
  qualifications?: string[];
  
  /** Related watersports activities (e.g., surfing, diving, sailing) */
  sports?: string[];
  
  /** Job categories/occupational areas (e.g., instructor, management) */
  occupationalAreas?: string[];
  
  /** URLs to job-related images (stored in Blob Storage) */
  pictures?: string[];
  
  /** Spam flag set by admins or automated systems */
  spam?: 'yes' | 'no';
  
  /** Whether the job is publicly visible (defaults to true) */
  published?: boolean;
  
  /** Whether the job is featured/highlighted (premium listing) */
  featured?: boolean;
  
  /** Number of times this job has been viewed */
  visitCount?: number;
  
  /** Whether applicants can apply via email */
  applyByEmail?: boolean;
  
  /** Whether applicants can apply via website */
  applyByWebsite?: boolean;
  
  /** Whether applicants can apply via WhatsApp */
  applyByWhatsApp?: boolean;
  
  /** Email address for job applications (if applyByEmail is true) */
  applicationEmail?: string;
  
  /** Website URL for job applications (if applyByWebsite is true) */
  applicationWebsite?: string;
  
  /** WhatsApp number for job applications (if applyByWhatsApp is true) */
  applicationWhatsApp?: string;
  
  /** Auto-generated timestamp of when the job was created */
  createdAt: Date;
  
  /** Auto-generated timestamp of when the job was last updated */
  updatedAt: Date;
}

/**
 * Mongoose schema for Job documents.
 * Defines the structure, validation, and default values for job listings.
 */
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
      ref: 'User', // References the User who created this job
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company', // References the associated Company (optional)
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
    }],
    pictures: [{
      type: String, // URLs to images stored in Vercel Blob Storage
    }],
    spam: {
      type: String,
      enum: ['yes', 'no'],
    },
    published: {
      type: Boolean,
      default: true, // Jobs are published by default
    },
    featured: {
      type: Boolean,
      default: false, // Premium feature, off by default
    },
    visitCount: {
      type: Number,
      default: 0, // Incremented each time someone views the job
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
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create indexes for efficient querying
JobSchema.index({ createdAt: -1 }); // For sorting by creation date
JobSchema.index({ updatedAt: -1 }); // For sorting by update date
JobSchema.index({ published: 1, createdAt: -1 }); // Compound index for published jobs sorted by date
JobSchema.index({ featured: 1, published: 1 }); // For featured published jobs
JobSchema.index({ recruiter: 1 }); // For recruiter's job queries
JobSchema.index({ companyId: 1 }); // For company-specific job queries
JobSchema.index({ country: 1 }); // For country-based filtering
JobSchema.index({ type: 1 }); // For job type filtering

/**
 * Job model for database operations.
 * In serverless environments, uses cached model if available to prevent recompilation errors.
 */
const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;
