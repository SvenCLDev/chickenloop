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
  contact?: {
    email?: string;
    officePhone?: string;
    whatsapp?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
  };
  offeredActivities?: string[]; // Array of offered activity strings
  offeredServices?: string[]; // Array of offered service strings
  logo?: string; // Company logo image URL
  pictures?: string[]; // Array of image paths (max 3)
  featured?: boolean; // Featured flag: true if featured, false otherwise
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
      trim: true,
    },
    pictures: {
      type: [String],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 3;
        },
        message: 'A company can have at most 3 pictures',
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
// Note: owner field already has unique: true which creates an index automatically
CompanySchema.index({ featured: 1 }); // For featured company filtering
CompanySchema.index({ createdAt: -1 }); // For sorting by creation date

const Company: Model<ICompany> = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema);

export default Company;


