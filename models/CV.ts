/**
 * CV (Resume) model for job seekers
 * 
 * This model represents a job seeker's curriculum vitae (CV/resume).
 * Each job seeker can create one CV that showcases their experience,
 * education, skills, and qualifications in the watersports industry.
 * CVs can be viewed by recruiters when published.
 * 
 * @module models/CV
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * CV document interface extending Mongoose Document.
 * Represents a job seeker's resume/curriculum vitae.
 */
export interface ICV extends Document {
  /** Full name of the job seeker */
  fullName: string;
  
  /** Contact email address */
  email: string;
  
  /** Contact phone number (optional) */
  phone?: string;
  
  /** Physical address or location (optional) */
  address?: string;
  
  /** Professional summary or objective statement (optional) */
  summary?: string;
  
  /** Array of work experience entries */
  experience: Array<{
    /** Company/organization name */
    company: string;
    /** Job title/position held */
    position: string;
    /** Start date (format: YYYY-MM or YYYY-MM-DD) */
    startDate: string;
    /** End date (optional for current positions) */
    endDate?: string;
    /** Description of responsibilities and achievements */
    description?: string;
  }>;
  
  /** Array of education entries */
  education: Array<{
    /** School/university name */
    institution: string;
    /** Degree obtained (e.g., Bachelor's, Master's) */
    degree: string;
    /** Field of study */
    field: string;
    /** Start date (format: YYYY-MM or YYYY) */
    startDate: string;
    /** End date (optional for ongoing education) */
    endDate?: string;
  }>;
  
  /** Array of general skills */
  skills: string[];
  
  /** Array of certifications (legacy field) */
  certifications?: string[];
  
  /** Array of professional certifications (e.g., diving licenses, sailing certs) */
  professionalCertifications?: string[];
  
  /** Array of experience and skill descriptions */
  experienceAndSkill?: string[];
  
  /** Languages spoken with proficiency levels */
  languages?: string[];
  
  /** Geographic areas or job types the candidate is interested in */
  lookingForWorkInAreas?: string[];
  
  /** URLs to CV-related images or documents (stored in Blob Storage) */
  pictures?: string[];
  
  /** Whether the CV is publicly visible to recruiters (defaults to true) */
  published?: boolean;
  
  /** Reference to the User (job seeker) who owns this CV */
  jobSeeker: mongoose.Types.ObjectId;
  
  /** Auto-generated timestamp of when the CV was created */
  createdAt: Date;
  
  /** Auto-generated timestamp of when the CV was last updated */
  updatedAt: Date;
}

/**
 * Mongoose schema for CV documents.
 * Defines the structure and validation rules for job seeker resumes.
 */
const CVSchema: Schema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
    summary: {
      type: String,
    },
    experience: [
      {
        company: String,
        position: String,
        startDate: String,
        endDate: String,
        description: String,
      },
    ],
    education: [
      {
        institution: String,
        degree: String,
        field: String,
        startDate: String,
        endDate: String,
      },
    ],
    skills: [String],
    certifications: [String],
    professionalCertifications: [String],
    experienceAndSkill: [String],
    languages: [String],
    lookingForWorkInAreas: [String],
    pictures: [String], // URLs to images stored in Vercel Blob Storage
    published: {
      type: Boolean,
      default: true, // CVs are published by default
    },
    jobSeeker: {
      type: Schema.Types.ObjectId,
      ref: 'User', // References the User who owns this CV
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

/**
 * CV model for database operations.
 * In serverless environments, uses cached model if available to prevent recompilation errors.
 */
const CV: Model<ICV> = mongoose.models.CV || mongoose.model<ICV>('CV', CVSchema);

// Create indexes for efficient querying
CVSchema.index({ createdAt: -1 }); // For sorting by creation date
// Compound index for published + createdAt queries (used in candidates-list)
CVSchema.index({ published: 1, createdAt: -1 });
// Index on jobSeeker for efficient $lookup operations
CVSchema.index({ jobSeeker: 1 });

export default CV;

