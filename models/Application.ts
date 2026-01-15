import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Application Status Lifecycle (ATS Workflow):
 * 
 * Core Statuses:
 * 1. applied (default) - Initial status when a job seeker applies or recruiter contacts a candidate
 * 2. viewed - Recruiter has viewed the application (automatically set when recruiter first views)
 * 3. contacted - Recruiter has reached out to the candidate (phone call, email, etc.)
 * 4. interviewing - Candidate is in the interview process (one or more interview stages)
 * 5. offered - Recruiter has extended a job offer to the candidate
 * 6. hired - Candidate has accepted the offer and been hired (terminal success state)
 * 7. accepted - Legacy status, kept for backward compatibility (maps to similar workflow as "offered")
 * 8. rejected - Recruiter has rejected the candidate at any stage (terminal rejection state)
 * 9. withdrawn - Candidate has withdrawn their application (job-seeker-only action, terminal state)
 * 
 * Authorization Rules:
 * - withdrawn: Can only be set by job seeker (the candidate who applied)
 * - rejected/hired: Can only be set by recruiter (the recruiter who owns the job)
 * - contacted/interviewing/offered: Can only be set by recruiter
 * - viewed: Automatically set by system when recruiter first views the application
 * 
 * Typical ATS Workflow:
 * - applied -> viewed (automatic on recruiter view)
 * - viewed -> contacted (recruiter initiates contact)
 * - contacted -> interviewing (candidate moves to interview stage)
 * - interviewing -> offered (candidate receives job offer)
 * - offered -> hired (candidate accepts offer) OR rejected (offer declined/withdrawn)
 * 
 * Alternative Workflows:
 * - applied/viewed/contacted/interviewing -> rejected (can be rejected at any stage)
 * - applied/viewed/contacted/interviewing -> withdrawn (candidate can withdraw at any stage before offer)
 * - Once withdrawn or rejected, status cannot be changed (terminal states)
 * - Once hired, status cannot be changed (terminal success state)
 */
export interface IApplication extends Document {
  jobId?: mongoose.Types.ObjectId | null;
  recruiterId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  // ATS Workflow Status: applied -> viewed -> contacted -> interviewing -> offered -> hired
  // Alternative outcomes: rejected (at any stage) or withdrawn (by candidate)
  status: 'applied' | 'viewed' | 'contacted' | 'interviewing' | 'offered' | 'hired' | 'accepted' | 'rejected' | 'withdrawn';
  appliedAt: Date;
  coverNote?: string;
  internalNotes?: string;
  recruiterNotes: string;
  adminNotes?: string; // Private admin-only notes
  lastActivityAt: Date;
  withdrawnAt?: Date;
  viewedAt?: Date;
  archivedByJobSeeker: boolean;
  archivedByRecruiter: boolean;
  archivedByAdmin: boolean; // Admin soft archive
  published?: boolean;
  adminActions?: Array<{ // Audit log for admin actions
    adminId: mongoose.Types.ObjectId;
    adminName: string;
    action: string; // e.g., 'status_changed', 'notes_updated', 'archived', 'unarchived'
    details?: string;
    timestamp: Date;
  }>;
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
      // ATS Workflow Statuses (current):
      // - applied: Initial status when candidate applies
      // - viewed: Recruiter has viewed the application
      // - contacted: Recruiter has reached out to candidate
      // - interviewing: Candidate is in interview process
      // - offered: Recruiter has extended job offer
      // - hired: Candidate accepted offer and was hired (terminal success)
      // - accepted: Legacy status (backward compatibility)
      // - rejected: Candidate rejected at any stage (terminal rejection)
      // - withdrawn: Candidate withdrew application (terminal withdrawal)
      // Legacy values for migration: 'new', 'interviewed' (mapped via statusMigrationMap)
      enum: [
        'applied',      // Default: Initial application status
        'viewed',       // Recruiter viewed the application
        'contacted',    // Recruiter contacted candidate
        'interviewing', // Candidate in interview process
        'offered',      // Job offer extended to candidate
        'hired',        // Candidate hired (terminal success)
        'accepted',     // Legacy: kept for backward compatibility
        'rejected',     // Candidate rejected (terminal rejection)
        'withdrawn',    // Candidate withdrew (terminal withdrawal)
        // Legacy migration values (automatically converted via statusMigrationMap):
        'new',          // Maps to 'applied'
        'interviewed',  // Maps to 'interviewing'
      ],
      default: 'applied',
      required: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    coverNote: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    internalNotes: {
      type: String,
    },
    recruiterNotes: {
      type: String,
      default: '',
    },
    adminNotes: {
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
    archivedByAdmin: {
      type: Boolean,
      default: false,
    },
    published: {
      type: Boolean,
      default: true,
    },
    adminActions: [{
      adminId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      adminName: {
        type: String,
        required: true,
      },
      action: {
        type: String,
        required: true,
      },
      details: {
        type: String,
      },
      timestamp: {
        type: Date,
        default: Date.now,
        required: true,
      },
    }],
  },
  {
    timestamps: true,
  }
);

/**
 * Status migration mapping for backward compatibility
 * Maps legacy status values to current ATS workflow statuses
 */
const statusMigrationMap: { [key: string]: string } = {
  'new': 'applied',        // Legacy: new applications -> applied
  'interviewed': 'interviewing', // Legacy: interviewed -> interviewing (new ATS status)
  // Note: 'contacted' and 'offered' are now valid statuses, no migration needed
  // 'contacted' was previously mapped to 'viewed', but is now a distinct status
  // 'offered' was previously mapped to 'accepted', but is now a distinct status
  'rejected': 'rejected', // Already correct
  'withdrawn': 'withdrawn', // Already correct
};

/**
 * Pre-validate hook: Migrate old status values to new status lifecycle
 * This handles backward compatibility with old status values in the database
 */
ApplicationSchema.pre('validate', function(next) {
  // Migrate old status values to new status lifecycle
  const currentStatus = this.status as string | undefined;
  if (currentStatus && statusMigrationMap[currentStatus]) {
    this.status = statusMigrationMap[currentStatus] as any;
  }
  next();
});

/**
 * Pre-save hook: Update updatedAt when status changes
 * This ensures updatedAt reflects the last status change, not just any field update
 */
ApplicationSchema.pre('save', function(next) {
  // Check if status is being modified
  if (this.isModified('status')) {
    // Update updatedAt to current timestamp
    this.updatedAt = new Date();
  }
  next();
});

// Create indexes for efficient querying
ApplicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true, sparse: true }); // Prevent duplicate applications per job (sparse since jobId can be null)
// Partial unique index: Only enforce uniqueness for recruiterId + candidateId when jobId is null
// This allows multiple applications from the same recruiter to the same candidate for different jobs
ApplicationSchema.index({ recruiterId: 1, candidateId: 1 }, { unique: true, partialFilterExpression: { jobId: null } });
ApplicationSchema.index({ recruiterId: 1, status: 1 }); // For recruiter dashboard queries
ApplicationSchema.index({ candidateId: 1 }); // For candidate's application history
ApplicationSchema.index({ jobId: 1 }, { sparse: true }); // For job-specific application lists (sparse since jobId can be null)
ApplicationSchema.index({ status: 1, appliedAt: -1 }); // For status-based queries with sorting
ApplicationSchema.index({ lastActivityAt: -1 }); // For recent activity queries

const Application: Model<IApplication> =
  mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;

