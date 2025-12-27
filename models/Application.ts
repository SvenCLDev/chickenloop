import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApplication extends Document {
  jobId?: mongoose.Types.ObjectId | null;
  recruiterId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  status: 'new' | 'contacted' | 'interviewed' | 'offered' | 'rejected' | 'withdrawn';
  appliedAt: Date;
  internalNotes?: string;
  recruiterNotes: string;
  lastActivityAt: Date;
  withdrawnAt?: Date;
  viewedAt?: Date;
  archivedByJobSeeker: boolean;
  archivedByRecruiter: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: false,
      default: null,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interviewed', 'offered', 'rejected', 'withdrawn'],
      default: 'new',
      required: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    internalNotes: {
      type: String,
    },
    recruiterNotes: {
      type: String,
      default: '',
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    withdrawnAt: {
      type: Date,
    },
    viewedAt: {
      type: Date,
    },
    archivedByJobSeeker: {
      type: Boolean,
      default: false,
    },
    archivedByRecruiter: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
ApplicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true, sparse: true }); // Prevent duplicate applications per job (sparse since jobId can be null)
ApplicationSchema.index({ recruiterId: 1, candidateId: 1 }, { unique: true }); // Prevent duplicate contacts per recruiter + candidate
ApplicationSchema.index({ recruiterId: 1, status: 1 }); // For recruiter dashboard queries
ApplicationSchema.index({ candidateId: 1 }); // For candidate's application history
ApplicationSchema.index({ jobId: 1 }, { sparse: true }); // For job-specific application lists (sparse since jobId can be null)
ApplicationSchema.index({ status: 1, appliedAt: -1 }); // For status-based queries with sorting
ApplicationSchema.index({ lastActivityAt: -1 }); // For recent activity queries

const Application: Model<IApplication> =
  mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;

