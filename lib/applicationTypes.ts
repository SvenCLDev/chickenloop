/**
 * Shared TypeScript types for Application-related data structures
 * 
 * These types represent the shape of Application objects and their embedded data
 * as returned by the API, used across job seeker and recruiter dashboards.
 */

/**
 * Lightweight Job snapshot embedded in Application objects
 * This is a subset of the full Job model, containing only the fields
 * needed for displaying application details in the ATS (Applicant Tracking System).
 */
export interface ApplicationJobSnapshot {
  _id: string;
  title: string;
  company: string;
  city: string;
  country?: string;
}


