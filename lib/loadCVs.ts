import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { parseCandidateSearchParams } from '@/lib/candidateSearchParams';

const PAGE_SIZE = 20;

export interface LoadCVsOptions {
  /** URL search params (e.g. from request.url) */
  searchParams: URLSearchParams;
}

export interface LoadCVsResult {
  cvs: any[];
  filters: {
    languages: string[];
    workAreas: string[];
    sports: string[];
    certifications: string[];
    experienceLevels: string[];
    availability: string[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Load CVs with aggregation. Ensures DB connection is established inside this function
 * before any CV.aggregate() call (same pattern as Job and Company loaders).
 * Uses the shared cached connection from connectDB() to avoid duplicate connections.
 */
export async function loadCVs(options: LoadCVsOptions): Promise<LoadCVsResult> {
  const { searchParams } = options;

  // Ensure connection is awaited before any CV.aggregate() (fix applied inside loadCVs)
  await connectDB();

  const featured = searchParams.get('featured');
  const filters = parseCandidateSearchParams(searchParams);

  // Build match conditions
  const matchConditions: any = {
    published: { $ne: false }
  };

  if (featured === 'true') {
    matchConditions.featured = true;
  }

  if (filters.kw) {
    const keywordRegex = new RegExp(filters.kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const keywordOr: any[] = [
      { fullName: keywordRegex },
      { summary: keywordRegex },
      { experienceAndSkill: keywordRegex },
      { professionalCertifications: keywordRegex },
      { lookingForWorkInAreas: keywordRegex },
      { 'experience.position': keywordRegex },
    ];
    matchConditions.$or = keywordOr;
  }

  if (filters.location) {
    const trimmedLocation = filters.location.trim();
    if (trimmedLocation.length >= 2 && trimmedLocation.length <= 100) {
      const escapedLocation = trimmedLocation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const locationRegex = new RegExp(escapedLocation, 'i');
      if (matchConditions.$or && filters.kw) {
        const keywordOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [
          { $or: keywordOr },
          { address: locationRegex }
        ];
      } else {
        matchConditions.address = locationRegex;
      }
    }
  }

  if (filters.workArea && filters.workArea.length > 0) {
    matchConditions.lookingForWorkInAreas = { $in: filters.workArea };
  }
  if (filters.language && filters.language.length > 0) {
    matchConditions.languages = { $in: filters.language };
  }
  if (filters.sport && filters.sport.length > 0) {
    matchConditions.experienceAndSkill = { $in: filters.sport };
  }
  if (filters.certification && filters.certification.length > 0) {
    matchConditions.professionalCertifications = { $in: filters.certification };
  }
  if (filters.experienceLevel && filters.experienceLevel.length > 0) {
    matchConditions.experienceLevel = { $in: filters.experienceLevel };
  }
  if (filters.availability && filters.availability.length > 0) {
    matchConditions.availability = { $in: filters.availability };
  }

  const sortOrder: any = { featured: -1, hasPictures: -1 };
  if (filters.sort === 'oldest') {
    sortOrder.createdAt = 1;
  } else {
    sortOrder.updatedAt = -1;
    sortOrder.createdAt = -1;
  }

  const page = filters.page || 1;
  const skip = (page - 1) * PAGE_SIZE;
  // Cap sort window so MongoDB can use "top N" optimization and stay under 32MB (works without allowDiskUse)
  const sortWindow = Math.min(skip + PAGE_SIZE, 10000);

  // Ensure we only include CVs from users with role 'job-seeker' (excludes orphaned or wrong-role refs)
  const roleFilterStages = [
    {
      $lookup: {
        from: 'users',
        localField: 'jobSeeker',
        foreignField: '_id',
        as: '_roleCheck',
        pipeline: [{ $match: { role: 'job-seeker' } }, { $limit: 1 }],
      },
    },
    { $match: { _roleCheck: { $ne: [] } } },
    { $project: { _roleCheck: 0 } },
  ];

  const aggregationPipeline: any[] = [
    { $match: matchConditions },
    ...roleFilterStages,
    {
      $project: {
        _id: 1,
        fullName: 1,
        summary: 1,
        address: 1,
        experienceAndSkill: 1,
        lookingForWorkInAreas: 1,
        languages: 1,
        professionalCertifications: 1,
        experienceLevel: 1,
        availability: 1,
        featured: 1,
        updatedAt: 1,
        createdAt: 1,
        pictures: { $slice: ['$pictures', 1] },
        jobSeeker: 1
      }
    },
    {
      $addFields: {
        hasPictures: { $cond: [{ $gt: [{ $size: { $ifNull: ['$pictures', []] } }, 0] }, 1, 0] }
      }
    },
    { $sort: sortOrder },
    { $limit: sortWindow }, // Bounded sort: only keep sortWindow docs in memory (avoids 32MB limit)
    { $skip: skip },
    { $limit: PAGE_SIZE },
    {
      $lookup: {
        from: 'users',
        localField: 'jobSeeker',
        foreignField: '_id',
        as: 'jobSeekerInfo',
        pipeline: [
          { $project: { _id: 1, name: 1, email: 1, lastOnline: 1 } }
        ]
      }
    },
    {
      $unwind: {
        path: '$jobSeekerInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        _id: 1,
        fullName: 1,
        summary: 1,
        address: 1,
        experienceAndSkill: 1,
        lookingForWorkInAreas: 1,
        languages: 1,
        professionalCertifications: 1,
        experienceLevel: 1,
        availability: 1,
        featured: 1,
        pictures: 1,
        createdAt: 1,
        jobSeeker: {
          _id: '$jobSeekerInfo._id',
          name: '$jobSeekerInfo.name',
          email: '$jobSeekerInfo.email',
          lastOnline: '$jobSeekerInfo.lastOnline'
        }
      }
    }
  ];

  const countPipeline = [
    { $match: matchConditions },
    ...roleFilterStages,
    { $count: 'total' },
  ];
  const aggOptions = { allowDiskUse: true };
  const countResult = await CV.aggregate(countPipeline, aggOptions);
  const totalCount = countResult.length > 0 ? countResult[0].total : 0;

  const filterExtractionPipeline = [
    { $match: matchConditions },
    ...roleFilterStages,
    {
      $project: {
        languages: 1,
        lookingForWorkInAreas: 1,
        experienceAndSkill: 1,
        professionalCertifications: 1,
        experienceLevel: 1,
        availability: 1,
      }
    }
  ];

  const allMatchingCvs = await CV.aggregate(filterExtractionPipeline, aggOptions);

  const uniqueLanguages = new Set<string>();
  const uniqueWorkAreas = new Set<string>();
  const uniqueSports = new Set<string>();
  const uniqueCertifications = new Set<string>();
  const uniqueExperienceLevels = new Set<string>();
  const uniqueAvailability = new Set<string>();

  allMatchingCvs.forEach((cv: any) => {
    if (cv.languages) cv.languages.forEach((lang: string) => uniqueLanguages.add(lang));
    if (cv.lookingForWorkInAreas) cv.lookingForWorkInAreas.forEach((area: string) => uniqueWorkAreas.add(area));
    if (cv.experienceAndSkill) cv.experienceAndSkill.forEach((sport: string) => uniqueSports.add(sport));
    if (cv.professionalCertifications) cv.professionalCertifications.forEach((cert: string) => uniqueCertifications.add(cert));
    if (cv.experienceLevel) uniqueExperienceLevels.add(cv.experienceLevel);
    if (cv.availability) uniqueAvailability.add(cv.availability);
  });

  // Bounded sort ($sort + $limit(sortWindow)) keeps memory under 32MB without requiring allowDiskUse
  const cvs = await CV.aggregate(aggregationPipeline, aggOptions);

  return {
    cvs,
    filters: {
      languages: Array.from(uniqueLanguages).sort(),
      workAreas: Array.from(uniqueWorkAreas).sort(),
      sports: Array.from(uniqueSports).sort(),
      certifications: Array.from(uniqueCertifications).sort(),
      experienceLevels: Array.from(uniqueExperienceLevels).sort(),
      availability: Array.from(uniqueAvailability).sort(),
    },
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: totalCount,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    }
  };
}
