import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  role?: 'recruiter' | 'job-seeker' | 'admin' | null;
  name?: string;

  providers?: {
    google?: { id: string };
    facebook?: { id: string };
    credentials?: { passwordHash: string };
  };

  favouriteJobs?: mongoose.Types.ObjectId[];
  favouriteCandidates?: mongoose.Types.ObjectId[];

  companyId?: mongoose.Types.ObjectId;

  lastOnline?: Date;

  /** Total successful logins (recruiters and job seekers only) */
  loginCount?: number;

  notesEnabled?: boolean;

  mustResetPassword?: boolean;
  passwordMigrated?: boolean;

  /** Recruiter 7-day follow-up email tracking */
  recruiterFollowUpEmailSent?: boolean;
  lastRecruiterFollowUpEmailAt?: Date | null;

  // 🔹 Migration metadata
  legacy?: {
    source: 'drupal7' | 'drupal';
    userId?: number;
    drupalUid?: string;
    migratedAt?: Date;
    roles?: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ['recruiter', 'job-seeker', 'admin'],
      required: false,
      default: null,
    },
    name: {
      type: String,
      required: false,
    },
    providers: {
      google: {
        id: { type: String },
      },
      facebook: {
        id: { type: String },
      },
      credentials: {
        passwordHash: { type: String },
      },
      default: {},
    },
    favouriteJobs: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Job',
      },
    ],
    favouriteCandidates: [
      {
        type: Schema.Types.ObjectId,
        ref: 'CV',
      },
    ],
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
      index: true,
    },
    lastOnline: Date,
    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notesEnabled: {
      type: Boolean,
      default: true,
    },
    mustResetPassword: {
      type: Boolean,
      default: false,
      index: true,
    },
    passwordMigrated: {
      type: Boolean,
      default: false,
    },
    recruiterFollowUpEmailSent: {
      type: Boolean,
      default: false,
    },
    lastRecruiterFollowUpEmailAt: {
      type: Date,
      default: null,
    },

    // 🔹 Legacy / migration
    legacy: {
      source: {
        type: String,
        enum: ['drupal7', 'drupal'],
      },
      userId: Number,
      drupalUid: String,
      migratedAt: Date,
      roles: [String],
    },
  },
  { timestamps: true }
);

const User = (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
