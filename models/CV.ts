import mongoose, { Schema, Document, Model } from 'mongoose';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import { ExperienceLevel, Availability, WorkArea } from '@/lib/domainTypes';

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
  lookingForWorkInAreas?: WorkArea[];
  pictures?: string[];
  published?: boolean;
  featured?: boolean;
  featuredUntil?: Date | null;
  experienceLevel?: ExperienceLevel;
  availability?: Availability;
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
    // Boosting: same semantics as Job — featuredUntil is source of truth; featured derived on save (no breaking changes for existing CVs)
    featured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: {
      type: Date,
      default: null,
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

// Instance method: true if time-limited featuring is active (featuredUntil set and in the future)
CVSchema.methods.isCurrentlyFeatured = function(): boolean {
  return !!(this as any).featuredUntil && (this as any).featuredUntil > new Date();
};

// Static helper: query filter for "currently featured" (featuredUntil in the future)
CVSchema.statics.isFeaturedQuery = function(): { featuredUntil: { $gt: Date } } {
  return { featuredUntil: { $gt: new Date() } };
};

// Pre-save hook: unified featured expiry — featuredUntil is source of truth; sync featured for legacy compatibility
CVSchema.pre('save', function(next) {
  const doc = this as any;
  const until = (doc.featuredUntil != null && doc.featuredUntil !== undefined)
    ? (doc.featuredUntil instanceof Date ? doc.featuredUntil : new Date(doc.featuredUntil))
    : null;
  doc.featured = !!(until && until > new Date());
  next();
});

interface ICVModel extends Model<ICV> {
  isFeaturedQuery(): { featuredUntil: { $gt: Date } };
}
const CV = (mongoose.models.CV as ICVModel) || mongoose.model<ICV, ICVModel>('CV', CVSchema);

// Create indexes for efficient querying
CVSchema.index({ createdAt: -1 });
// Compound index for published + createdAt queries (used in candidates-list)
CVSchema.index({ published: 1, createdAt: -1 });
// Compound index for sorting (featured first) and filtering (published), then by updatedAt (schema has timestamps)
CVSchema.index({ featured: -1, published: 1, updatedAt: -1 });
CVSchema.index({ featuredUntil: 1 }); // For time-limited featuring queries
// Index on jobSeeker for efficient $lookup operations and admin queries
CVSchema.index({ jobSeeker: 1 }, { name: 'idx_cvs_jobSeeker' });
// Indexes for search/filtering on new fields
CVSchema.index({ experienceLevel: 1 });
CVSchema.index({ availability: 1 });

export default CV;

