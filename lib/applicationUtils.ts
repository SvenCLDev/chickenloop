/**
 * Utility functions for sanitizing application data based on user role
 * Ensures recruiterNotes and internalNotes are never exposed to job seekers
 */

import { JWTPayload } from './jwt';

/**
 * Sanitize application object to remove recruiter-only fields for job seekers
 * @param application - The application object (can be Mongoose document or plain object)
 * @param userRole - The role of the user requesting the data
 * @returns Sanitized application object
 */
export function sanitizeApplicationForRole(application: any, userRole: string): any {
  if (!application) {
    return null;
  }

  // For recruiters and admins, return full application
  if (userRole === 'recruiter' || userRole === 'admin') {
    return application;
  }

  // For job seekers, create a sanitized copy without recruiter-only fields
  const sanitized: any = {
    _id: application._id,
    status: application.status,
    appliedAt: application.appliedAt,
    lastActivityAt: application.lastActivityAt,
    withdrawnAt: application.withdrawnAt,
    viewedAt: application.viewedAt,
    archivedByJobSeeker: application.archivedByJobSeeker,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };

  // Include job data if available
  if (application.jobId) {
    sanitized.job = typeof application.jobId === 'object' 
      ? {
          _id: application.jobId._id,
          title: application.jobId.title,
          company: application.jobId.company,
          location: application.jobId.location,
          country: application.jobId.country,
          type: application.jobId.type,
          createdAt: application.jobId.createdAt,
        }
      : null;
  } else {
    sanitized.job = null;
  }

  // Include company data if available
  if (application.company) {
    sanitized.company = application.company;
  }

  // Include candidate data if available (for job seekers, this is themselves)
  if (application.candidateId) {
    sanitized.candidate = typeof application.candidateId === 'object'
      ? {
          _id: application.candidateId._id,
          name: application.candidateId.name,
          email: application.candidateId.email,
        }
      : null;
  }

  // Include recruiter data if available (name and email only, no notes)
  if (application.recruiterId) {
    sanitized.recruiter = typeof application.recruiterId === 'object'
      ? {
          _id: application.recruiterId._id,
          name: application.recruiterId.name,
          email: application.recruiterId.email,
        }
      : null;
  }

  // Explicitly exclude recruiterNotes and internalNotes
  // These fields are NEVER returned to job seekers

  return sanitized;
}

/**
 * Server-side guard to ensure recruiterNotes is never returned to job seekers
 * Throws an error if recruiterNotes is detected in a job seeker response
 * @param data - The response data to check
 * @param userRole - The role of the user
 */
export function guardAgainstRecruiterNotesLeak(data: any, userRole: string): void {
  if (userRole === 'job-seeker') {
    // Recursively check for recruiterNotes in the response
    const checkObject = (obj: any, path: string = ''): void => {
      if (obj === null || obj === undefined) return;
      
      if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            checkObject(item, `${path}[${index}]`);
          });
        } else {
          for (const key in obj) {
            if (key === 'recruiterNotes' || key === 'internalNotes') {
              throw new Error(
                `SECURITY VIOLATION: recruiterNotes/internalNotes detected in job seeker response at path: ${path}.${key}`
              );
            }
            checkObject(obj[key], path ? `${path}.${key}` : key);
          }
        }
      }
    };

    checkObject(data);
  }
}

