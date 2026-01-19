/**
 * Shared Domain Types
 * 
 * This file contains shared type definitions and enums used across
 * Job, CV, and Application models. These types ensure consistency
 * across the codebase and provide type safety.
 */

/**
 * Application Status - ATS Workflow States
 * 
 * Core Statuses:
 * - applied: Initial status when a job seeker applies or recruiter contacts a candidate
 * - viewed: Recruiter has viewed the application (automatically set when recruiter first views)
 * - contacted: Recruiter has reached out to the candidate
 * - interviewing: Candidate is in the interview process
 * - offered: Recruiter has extended a job offer to the candidate
 * - hired: Candidate has accepted the offer and been hired (terminal success state)
 * - accepted: Legacy status, kept for backward compatibility (maps to similar workflow as "offered")
 * - rejected: Recruiter has rejected the candidate at any stage (terminal rejection state)
 * - withdrawn: Candidate has withdrawn their application (terminal withdrawal state)
 */
export type ApplicationStatus = 
  | 'applied' 
  | 'viewed' 
  | 'contacted' 
  | 'interviewing' 
  | 'offered' 
  | 'hired' 
  | 'accepted' 
  | 'rejected' 
  | 'withdrawn';

/**
 * Terminal states that cannot be transitioned from
 */
export const TERMINAL_STATES: ApplicationStatus[] = ['rejected', 'withdrawn', 'hired'];

/**
 * Employment Type - Job contract types
 */
export type EmploymentType = 
  | 'full-time' 
  | 'part-time' 
  | 'contract' 
  | 'freelance';

/**
 * Experience Level - Candidate experience levels
 */
export type ExperienceLevel = 
  | 'entry' 
  | 'intermediate' 
  | 'experienced' 
  | 'senior';

/**
 * Availability Status - Candidate availability
 */
export type Availability = 
  | 'available_now' 
  | 'available_soon' 
  | 'seasonal' 
  | 'not_available';

/**
 * Spam Flag - Binary flag for spam detection
 */
export type SpamFlag = 'yes' | 'no';

/**
 * Work Area / Job Category
 * 
 * These are the occupational areas used in both Job.occupationalAreas
 * and CV.lookingForWorkInAreas. This ensures consistency between
 * job postings and candidate preferences.
 * 
 * Import from @/src/constants/jobCategories for the actual values array.
 */
export type WorkArea = 
  | 'Instruction'
  | 'Support'
  | 'Hospitality'
  | 'Events'
  | 'Management'
  | 'Operations'
  | 'Maintenance'
  | 'Marketing'
  | 'Creative'
  | 'Sales';

/**
 * Type Guards
 * 
 * These functions help validate data that may come from legacy records
 * or external sources, ensuring type safety.
 */

/**
 * Type guard for ApplicationStatus
 */
export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  if (typeof value !== 'string') return false;
  const validStatuses: ApplicationStatus[] = [
    'applied', 'viewed', 'contacted', 'interviewing', 
    'offered', 'hired', 'accepted', 'rejected', 'withdrawn'
  ];
  return validStatuses.includes(value as ApplicationStatus);
}

/**
 * Type guard for EmploymentType
 */
export function isEmploymentType(value: unknown): value is EmploymentType {
  if (typeof value !== 'string') return false;
  const validTypes: EmploymentType[] = ['full-time', 'part-time', 'contract', 'freelance'];
  return validTypes.includes(value as EmploymentType);
}

/**
 * Type guard for ExperienceLevel
 */
export function isExperienceLevel(value: unknown): value is ExperienceLevel {
  if (typeof value !== 'string') return false;
  const validLevels: ExperienceLevel[] = ['entry', 'intermediate', 'experienced', 'senior'];
  return validLevels.includes(value as ExperienceLevel);
}

/**
 * Type guard for Availability
 */
export function isAvailability(value: unknown): value is Availability {
  if (typeof value !== 'string') return false;
  const validAvailabilities: Availability[] = [
    'available_now', 'available_soon', 'seasonal', 'not_available'
  ];
  return validAvailabilities.includes(value as Availability);
}

/**
 * Type guard for SpamFlag
 */
export function isSpamFlag(value: unknown): value is SpamFlag {
  if (typeof value !== 'string') return false;
  return value === 'yes' || value === 'no';
}

/**
 * Type guard for WorkArea
 */
export function isWorkArea(value: unknown): value is WorkArea {
  if (typeof value !== 'string') return false;
  const validAreas: WorkArea[] = [
    'Instruction', 'Support', 'Hospitality', 'Events',
    'Management', 'Operations', 'Maintenance', 'Marketing',
    'Creative', 'Sales'
  ];
  return validAreas.includes(value as WorkArea);
}

/**
 * Normalize ApplicationStatus from legacy values
 * Handles migration from old status values to new ones
 */
export function normalizeApplicationStatus(value: unknown): ApplicationStatus {
  if (isApplicationStatus(value)) {
    return value;
  }
  
  // Legacy status mappings
  if (typeof value === 'string') {
    const legacyMap: Record<string, ApplicationStatus> = {
      'new': 'applied',
      'interviewed': 'interviewing',
    };
    
    if (legacyMap[value]) {
      return legacyMap[value];
    }
  }
  
  // Default fallback
  return 'applied';
}

/**
 * Normalize EmploymentType from legacy values
 */
export function normalizeEmploymentType(value: unknown): EmploymentType | null {
  if (isEmploymentType(value)) {
    return value;
  }
  
  // Handle common variations
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'fulltime' || normalized === 'full time') return 'full-time';
    if (normalized === 'parttime' || normalized === 'part time') return 'part-time';
  }
  
  return null;
}

/**
 * Normalize WorkArea from legacy values
 * Ensures case-insensitive matching and handles variations
 */
export function normalizeWorkArea(value: unknown): WorkArea | null {
  if (isWorkArea(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    // Case-insensitive lookup
    const normalized = value.trim();
    const validAreas: WorkArea[] = [
      'Instruction', 'Support', 'Hospitality', 'Events',
      'Management', 'Operations', 'Maintenance', 'Marketing',
      'Creative', 'Sales'
    ];
    
    const match = validAreas.find(area => 
      area.toLowerCase() === normalized.toLowerCase()
    );
    
    if (match) {
      return match;
    }
  }
  
  return null;
}
