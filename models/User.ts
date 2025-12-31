/**
 * User model for authentication and authorization
 * 
 * This model represents users in the ChickenLoop platform. There are three user roles:
 * - job-seeker: Can create CVs, browse jobs, and save favorites
 * - recruiter: Can post jobs, create companies, and view candidate CVs
 * - admin: Can manage all users, jobs, companies, and platform data
 * 
 * @module models/User
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * User document interface extending Mongoose Document.
 * Represents a user in the system with authentication and role information.
 */
export interface IUser extends Document {
  /** User's email address (unique, lowercase, trimmed) */
  email: string;
  
  /** Hashed password (using bcrypt) - never send to client */
  password: string;
  
  /** User's role determining their permissions in the platform */
  role: 'recruiter' | 'job-seeker' | 'admin';
  
  /** User's full name or display name */
  name: string;
  
  /** Array of job IDs that the user has marked as favorites (job-seekers only) */
  favouriteJobs?: mongoose.Types.ObjectId[];
  
  /** Array of CV IDs that the user has marked as favorites (recruiters only) */
  favouriteCandidates?: mongoose.Types.ObjectId[];
  
  /** Timestamp of the user's last activity (optional, for analytics) */
  lastOnline?: Date;
  
  /** Auto-generated timestamp of when the user account was created */
  createdAt: Date;
  
  /** Auto-generated timestamp of when the user account was last updated */
  updatedAt: Date;
}

/**
 * Mongoose schema for User documents.
 * Defines the structure and validation rules for user data in MongoDB.
 */
const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // Ensures no duplicate email addresses
      lowercase: true, // Automatically convert to lowercase
      trim: true, // Remove whitespace from both ends
    },
    password: {
      type: String,
      required: true,
      // Note: Password should be hashed before saving (done in API routes)
    },
    role: {
      type: String,
      enum: ['recruiter', 'job-seeker', 'admin'], // Only these values are allowed
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    favouriteJobs: [{
      type: Schema.Types.ObjectId,
      ref: 'Job', // References the Job collection
    }],
    favouriteCandidates: [{
      type: Schema.Types.ObjectId,
      ref: 'CV', // References the CV collection
    }],
    lastOnline: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create indexes for efficient querying
UserSchema.index({ role: 1 }); // For role-based filtering
UserSchema.index({ createdAt: -1 }); // For sorting by creation date
UserSchema.index({ lastOnline: -1 }); // For sorting by last online

/**
 * User model for database operations.
 * In serverless environments, uses cached model if available to prevent recompilation errors.
 */
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

