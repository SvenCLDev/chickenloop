import mongoose, { Schema, Document, Model } from 'mongoose';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';

export interface ICV extends Document {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  summary?: string;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
  }>;
  skills: string[];
  certifications?: string[];
  professionalCertifications?: string[];
  experienceAndSkill?: string[];
  languages?: string[];
  lookingForWorkInAreas?: string[];
  pictures?: string[];
  published?: boolean;
  experienceLevel?: 'entry' | 'intermediate' | 'experienced' | 'senior';
  availability?: 'available_now' | 'available_soon' | 'seasonal' | 'not_available';
  jobSeeker: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
    lookingForWorkInAreas: {
      type: [{
        type: String,
        enum: [...JOB_CATEGORIES],
      }],
      // Required for new documents, but allow existing documents without it for backward compatibility
      // Validation is enforced at API level for create/update operations
      default: [],
    },
    pictures: [String],
    published: {
      type: Boolean,
      default: true,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'intermediate', 'experienced', 'senior'],
    },
    availability: {
      type: String,
      enum: ['available_now', 'available_soon', 'seasonal', 'not_available'],
    },
    jobSeeker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CV: Model<ICV> = mongoose.models.CV || mongoose.model<ICV>('CV', CVSchema);

// Create indexes for efficient querying
CVSchema.index({ createdAt: -1 });
// Compound index for published + createdAt queries (used in candidates-list)
CVSchema.index({ published: 1, createdAt: -1 });
// Index on jobSeeker for efficient $lookup operations
CVSchema.index({ jobSeeker: 1 });
// Indexes for search/filtering on new fields
CVSchema.index({ experienceLevel: 1 });
CVSchema.index({ availability: 1 });

export default CV;

