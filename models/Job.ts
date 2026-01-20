import mongoose, { Schema, Document, Model } from 'mongoose';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import { EmploymentType, SpamFlag, WorkArea } from '@/lib/domainTypes';

export interface IJob extends Document {
  title: string;
  description: string;
  company: string;
  city: string;
  country?: string | null;
  salary?: string;
  type: EmploymentType;
  recruiter: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  languages?: string[];
  qualifications?: string[];
  sports?: string[];
  occupationalAreas?: WorkArea[];
  pictures?: string[];
  spam?: SpamFlag;
  published?: boolean;
  featured?: boolean;
  visitCount?: number;
  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applyViaATS?: boolean;
  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;
  datePosted?: Date; // System-managed: set when job is first published (Google Jobs SEO)
  validThrough?: Date; // System-managed: datePosted + 90 days (Google Jobs SEO)
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
    city: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      // Required for new documents, but allow existing documents without it for backward compatibility
      // Validation is enforced at API level for create/update operations
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
    occupationalAreas: {
      type: [{
        type: String,
        enum: [...JOB_CATEGORIES],
      }],
      // Required for new documents, but allow existing documents without it for backward compatibility
      // Validation is enforced at API level for create/update operations
      default: [],
    },
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
    applyViaATS: {
      type: Boolean,
      default: true,
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
    datePosted: {
      type: Date,
      // System-managed field - not editable by users
      // Set automatically when job is first published
    },
    validThrough: {
      type: Date,
      // System-managed field - not editable by users
      // Set automatically to datePosted + 90 days
    },
  },
  {
    timestamps: true,
  }
);

// Schema-level safeguard: Prevent reintroduction of deprecated `location` field
// Mongoose strict mode (enabled by default) will ignore fields not in the schema,
// but we add explicit hooks as an additional safeguard

// Post-init hook: Set default applyViaATS for existing jobs loaded from database
JobSchema.post('init', function() {
  const doc = this as any;
  // Set default to true if field is missing (for backward compatibility with existing jobs)
  if (doc.applyViaATS === undefined) {
    doc.applyViaATS = true;
  }
});

// Pre-save hook: Manage system-managed date fields and remove deprecated fields
JobSchema.pre('save', function(next) {
  const doc = this as any;
  
  // Remove `location` field if present (should not happen due to strict mode + API validation)
  if (doc.location !== undefined) {
    delete doc.location;
  }
  
  // Default applyViaATS to true for existing jobs that don't have this field
  if (doc.applyViaATS === undefined) {
    doc.applyViaATS = true;
  }
  
  // System-managed date fields for Google Jobs SEO
  const isNew = this.isNew;
  const wasPublished = this.get('published') === true;
  const isBeingPublished = doc.published !== undefined ? doc.published === true : wasPublished;
  const currentDatePosted = this.get('datePosted');
  
  // Only manage dates for published jobs
  if (isBeingPublished) {
    // Set datePosted when job is first published (never change it once set)
    if (!currentDatePosted) {
      // Use createdAt as fallback for backward compatibility, or current date
      const createdAt = this.get('createdAt');
      
      let normalizedDate: Date;
      
      if (createdAt instanceof Date) {
        normalizedDate = createdAt;
      } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        normalizedDate = new Date(createdAt);
      } else {
        normalizedDate = new Date();
      }
      
      doc.datePosted = normalizedDate;
    }
    // datePosted is never changed once set (preserve existing value)
    
    // Ensure validThrough exists: datePosted + 90 days
    if (!doc.validThrough && !this.get('validThrough')) {
      // Get datePosted value (could be from doc or current value)
      const datePostedValue = doc.datePosted || currentDatePosted;
      
      let datePostedDate: Date;
      
      if (datePostedValue instanceof Date) {
        datePostedDate = datePostedValue;
      } else if (datePostedValue) {
        // datePostedValue exists but is not a Date, try to convert it
        if (typeof datePostedValue === 'string' || typeof datePostedValue === 'number') {
          datePostedDate = new Date(datePostedValue);
        } else {
          // Fallback to createdAt or current date
          const createdAt = this.get('createdAt');
          if (createdAt instanceof Date) {
            datePostedDate = createdAt;
          } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
            datePostedDate = new Date(createdAt);
          } else {
            datePostedDate = new Date();
          }
        }
      } else {
        // No datePosted value, use createdAt or current date
        const createdAt = this.get('createdAt');
        if (createdAt instanceof Date) {
          datePostedDate = createdAt;
        } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
          datePostedDate = new Date(createdAt);
        } else {
          datePostedDate = new Date();
        }
      }
      
      const validThroughDate = new Date(datePostedDate);
      validThroughDate.setDate(validThroughDate.getDate() + 90);
      doc.validThrough = validThroughDate;
    }
  }
  
  next();
});

// Pre-update hooks: Strip system-managed fields and deprecated fields from update operations
JobSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function() {
  const update = this.getUpdate() as any;
  if (update && typeof update === 'object') {
    // Remove deprecated `location` field
    if (update.$set && update.$set.location !== undefined) {
      delete update.$set.location;
    }
    if (update.location !== undefined) {
      delete update.location;
    }
    
    // Remove system-managed fields (datePosted, validThrough)
    // These are managed server-side in API routes, not via direct updates
    if (update.$set) {
      delete update.$set.datePosted;
      delete update.$set.validThrough;
    }
    if (update.datePosted !== undefined) {
      delete update.datePosted;
    }
    if (update.validThrough !== undefined) {
      delete update.validThrough;
    }
    
    // Explicitly unset deprecated fields if they were present
    if (update.$set?.location !== undefined || update.location !== undefined) {
      update.$unset = update.$unset || {};
      update.$unset.location = '';
    }
    
    // Ensure applyViaATS defaults to true for existing jobs if not explicitly set
    // Only set default if the field is not being explicitly updated
    if (update.$set && update.$set.applyViaATS === undefined && update.applyViaATS === undefined) {
      // Check if the document exists and doesn't have the field
      // We'll handle this at query time via a getter instead to avoid modifying updates
    }
  }
});

// Ensure strict mode is enabled (default, but explicit for clarity)
JobSchema.set('strict', true);

// Create indexes for efficient querying
JobSchema.index({ createdAt: -1 }); // For sorting by creation date
JobSchema.index({ updatedAt: -1 }); // For sorting by update date
JobSchema.index({ published: 1, createdAt: -1 }); // Compound index for published jobs sorted by date
JobSchema.index({ featured: 1, published: 1 }); // For featured published jobs
JobSchema.index({ recruiter: 1 }); // For recruiter's job queries
JobSchema.index({ companyId: 1 }); // For company-specific job queries
JobSchema.index({ country: 1 }); // For country-based filtering (semantic location search)
JobSchema.index({ city: 1 }); // For city-based filtering (semantic location search and exact city filter)
JobSchema.index({ type: 1 }); // For job type filtering

const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;
