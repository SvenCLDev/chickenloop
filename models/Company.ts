import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompany extends Document {
  name: string;
  description?: string;

  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  coordinates?: {
    latitude: number;
    longitude: number;
  };

  website?: string;
  email?: string;

  featured?: boolean;
  featuredUntil?: Date | null;

  // 🔹 Ownership (explicit!)
  ownerRecruiter: mongoose.Types.ObjectId;

  // 🔹 Migration / review status
  status: 'active' | 'needs_review' | 'placeholder';

  legacy?: {
    source: 'drupal7';
    companyNodeId?: number;
    recruiterUserId?: number;
    inferred: boolean;
    confidence: 'high' | 'medium' | 'low';
    originalNames?: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,

    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    coordinates: {
      latitude: Number,
      longitude: Number,
    },

    website: String,
    email: String,

    featured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: {
      type: Date,
      default: null,
    },

    // 🔹 Explicit recruiter ownership
    ownerRecruiter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // 🔹 Status flag for migration + admin review
    status: {
      type: String,
      enum: ['active', 'needs_review', 'placeholder'],
      default: 'active',
      index: true,
    },

    // 🔹 Legacy / migration metadata
    legacy: {
      source: {
        type: String,
        enum: ['drupal7'],
      },
      companyNodeId: Number,
      recruiterUserId: Number,
      inferred: Boolean,
      confidence: {
        type: String,
        enum: ['high', 'medium', 'low'],
      },
      originalNames: [String],
    },
  },
  { timestamps: true }
);

// Indexes for queries
CompanySchema.index({ featured: 1 });
CompanySchema.index({ featuredUntil: 1 });
CompanySchema.index({ createdAt: -1 });

interface ICompanyModel extends Model<ICompany> {
  isFeaturedQuery(): { featuredUntil: { $gt: Date } };
}

CompanySchema.statics.isFeaturedQuery = function () {
  return { featuredUntil: { $gt: new Date() } };
};

const Company =
  (mongoose.models.Company as ICompanyModel) ||
  mongoose.model<ICompany, ICompanyModel>('Company', CompanySchema);

export default Company;
