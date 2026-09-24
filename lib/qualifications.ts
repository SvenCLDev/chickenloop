/**
 * List of required qualifications organized by category
 * Each category has a header and items
 */

export interface QualificationCategory {
  header: string;
  items: string[];
}

export const QUALIFICATIONS: QualificationCategory[] = [
  {
    header: 'Surf Instructor Certifications',
    items: [
      'ISA Surf Instructor Level 1',
      'ISA Surf Instructor Level 2',
      'ISA Stand Up Paddle (SUP) Instructor',
      'ASI Surf Instructor Level 1',
      'ASI Surf Instructor Level 2',
      'Surfing Australia Foundation Surf Coach',
      'Surfing Australia Progression Surf Coach',
      'Surfing Australia Club Coach',
      'Surfing Australia Foundation SUP Coach',
    ],
  },
  {
    header: 'Safety / Lifesaving',
    items: [
      'Surf Lifesaving Certificate (SLS)',
      'Beach Lifeguard (RNLI / ILS)',
      'First Aid for Watersports',
    ],
  },
  {
    header: 'Kitesurfing',
    items: [
      'IKO Assistant Instructor',
      'IKO Level 1 Instructor',
      'IKO Level 2 Instructor',
      'VDWS Windsurf Instructor',
      'VDWS Kitesurf Instructor Level 1',
      'VDWS Kitesurf Instructor Level 2',
      'BKSA Kitesurf Instructor Level 1',
      'BKSA Senior Instructor',
      'WWS B1 Watersport Instructor (Kite/Wind/Sail/SUP)',
      'WWS Head Instructor',
    ],
  },
  {
    header: 'Sailing and Powerboat',
    items: [
      'RYA Dinghy Instructor',
      'RYA Advanced Dinghy Instructor',
      'RYA Keelboat Instructor',
      'RYA Multihull Instructor',
      'RYA Competent Crew',
      'RYA Day Skipper',
      'RYA Coastal Skipper',
      'RYA Yachtmaster Coastal',
      'RYA Yachtmaster Offshore',
      'RYA Yachtmaster Ocean',
      'ICC – International Certificate of Competence',
      'RYA Powerboat Level 1',
      'RYA Powerboat Level 2',
      'RYA Safety Boat Certificate',
      'RYA Advanced Powerboat',
    ],
  },
  {
    header: 'Diving',
    items: [
      'PADI Open Water Diver',
      'PADI Advanced Open Water Diver',
      'PADI Divemaster',
      'PADI Assistant Instructor',
      'PADI OWSI – Open Water Scuba Instructor',
      'PADI MSDT – Master Scuba Diver Trainer',
      'SSI Dive Instructor',
      'CMAS Two-Star / Three-Star Instructor',
      'Nitrox / Enriched Air Diver',
      'Deep Diver',
      'Rescue Diver',
      'Emergency First Response (EFR)',
      'Freediving Level 1 / Level 2 (AIDA/SSI/PADI)',
    ],
  },
  {
    header: 'Kayaking and Paddlesports',
    items: [
      'Paddlesport Instructor',
      'Paddlesport Leader',
      'Canoe Coach (Whitewater)',
      'Sea Kayak Leader',
      'Advanced Sea Kayak Leader',
      'SUP Instructor (BC or ASI)',
    ],
  },
];

/**
 * Get all qualification items as a flat array
 */
export function getAllQualifications(): string[] {
  return QUALIFICATIONS.flatMap((category) => category.items);
}

/**
 * Check if a qualification is valid
 */
export function isValidQualification(qualification: string): boolean {
  return getAllQualifications().includes(qualification);
}



