import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'recruiter' | 'job-seeker' | 'admin';
  name: string;
  favouriteJobs?: mongoose.Types.ObjectId[];
  favouriteCandidates?: mongoose.Types.ObjectId[];
  lastOnline?: Date;
  notesEnabled?: boolean; // Feature flag for recruiterNotes functionality (default: true)
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['recruiter', 'job-seeker', 'admin'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    favouriteJobs: [{
      type: Schema.Types.ObjectId,
      ref: 'Job',
    }],
    favouriteCandidates: [{
      type: Schema.Types.ObjectId,
      ref: 'CV',
    }],
    lastOnline: {
      type: Date,
    },
    notesEnabled: {
      type: Boolean,
      default: true, // Default enabled for all recruiters
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

