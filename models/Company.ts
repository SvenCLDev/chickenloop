/**
 * Company model for watersports businesses
 * 
 * This model represents companies/businesses in the watersports industry.
 * Recruiters can create one company profile that includes detailed information
 * about their business, including location, services, activities, and contact details.
 * Companies can be featured for premium visibility and are displayed on company listings.
 * 
 * @module models/Company
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Company document interface extending Mongoose Document.
 * Represents a watersports business/company profile.
 */
export interface ICompany extends Document {
  /** Company name */
  name: string;
  
  /** Detailed description of the company (optional) */
  description?: string;
  
  /** Physical address of the company */
  address?: {
    /** Street address */
    street?: string;
    /** City name */
    city?: string;
    /** State/province/region */
    state?: string;
    /** Postal/ZIP code */
    postalCode?: string;
    /** ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'FR') */
    country?: string;
  };
  
  /** Geographic coordinates for map display */
  coordinates?: {
    /** Latitude coordinate */
    latitude: number;
    /** Longitude coordinate */
    longitude: number;
  };
  
  /** Company website URL (optional) */
  website?: string;
  
  /** Contact information */
  contact?: {
    /** Contact email address */
    email?: string;
    /** Office phone number */
    officePhone?: string;
    /** WhatsApp contact number */
    whatsapp?: string;
  };
  
  /** Social media profile URLs */
  socialMedia?: {
    /** Facebook page URL */
    facebook?: string;
    /** Instagram profile URL */
    instagram?: string;
    /** TikTok profile URL */
    tiktok?: string;
    /** YouTube channel URL */
    youtube?: string;
    /** Twitter/X profile URL */
    twitter?: string;
  };
  
  /** Array of watersports activities offered (e.g., surfing, diving, sailing) */
  offeredActivities?: string[];
  
  /** Array of services offered (e.g., courses, rentals, tours) */
  offeredServices?: string[];
  
  /** Company logo image URL (stored in Blob Storage) */
  logo?: string;
  
  /** Array of company images (max 3, stored in Blob Storage) */
  pictures?: string[];
  
  /** Whether the company is featured/highlighted (premium listing) */
  featured?: boolean;
  
  /** Reference to the User (recruiter) who owns this company */
  owner: mongoose.Types.ObjectId;
  
  /** Auto-generated timestamp of when the company was created */
  createdAt: Date;
  
  /** Auto-generated timestamp of when the company was last updated */
  updatedAt: Date;
}

/**
 * Mongoose schema for Company documents.
 * Defines the structure, validation, and constraints for company profiles.
 */
const CompanySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      street: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      postalCode: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
        // ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'FR', 'DE')
        // Stored in uppercase for consistency
      },
    },
    coordinates: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
    },
    website: {
      type: String,
      trim: true,
    },
    contact: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      officePhone: {
        type: String,
        trim: true,
      },
      whatsapp: {
        type: String,
        trim: true,
      },
    },
    socialMedia: {
      facebook: {
        type: String,
        trim: true,
      },
      instagram: {
        type: String,
        trim: true,
      },
      tiktok: {
        type: String,
        trim: true,
      },
      youtube: {
        type: String,
        trim: true,
      },
      twitter: {
        type: String,
        trim: true,
      },
    },
    offeredActivities: {
      type: [String],
    },
    offeredServices: {
      type: [String],
    },
    logo: {
      type: String,
      trim: true, // URL to logo stored in Vercel Blob Storage
    },
    pictures: {
      type: [String], // URLs to images stored in Vercel Blob Storage
      validate: {
        validator: function(v: string[]) {
          return v.length <= 3; // Maximum 3 pictures allowed
        },
        message: 'A company can have at most 3 pictures',
      },
    },
    featured: {
      type: Boolean,
      default: false, // Premium feature, off by default
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User', // References the User who owns this company
      required: true,
      unique: true, // Each recruiter can only have one company
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create indexes for efficient querying
// Note: owner field already has unique: true which creates an index automatically
CompanySchema.index({ featured: 1 }); // For featured company filtering
CompanySchema.index({ createdAt: -1 }); // For sorting by creation date

/**
 * Company model for database operations.
 * In serverless environments, uses cached model if available to prevent recompilation errors.
 */
const Company: Model<ICompany> = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

export default Company;


