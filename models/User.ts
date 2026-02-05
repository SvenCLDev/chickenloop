import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'recruiter' | 'job-seeker' | 'admin';
  name: string;

  favouriteJobs?: mongoose.Types.ObjectId[];
  favouriteCandidates?: mongoose.Types.ObjectId[];

  lastOnline?: Date;
  notesEnabled?: boolean;

  // 🔹 Migration metadata
  legacy?: {
    source: 'drupal7';
    userId: number;
    roles: string[];
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
    favouriteJobs: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Job',
      },
    ],
    favouriteCandidates: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastOnline: Date,
    notesEnabled: {
      type: Boolean,
      default: true,
    },

    // 🔹 Legacy / migration
    legacy: {
      source: {
        type: String,
        enum: ['drupal7'],
      },
      userId: Number,
      roles: [String],
    },
  },
  { timestamps: true }
);

const User = (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>('User', UserSchema);

export default User;
