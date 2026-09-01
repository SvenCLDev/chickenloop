import connectDB from '@/lib/db';
import CV from '@/models/CV';
import { normalizeCandidateSortKey, parseCandidateSearchParams } from '@/lib/candidateSearchParams';

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
    preferredCountries: string[];
    eligibleCountries: string[];
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
    matchConditions.$and = [
      {
        $or: [
          { featured: true },
          { featuredUntil: { $gt: new Date() } },
        ],
      },
    ];
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
    if (matchConditions.$and) {
      matchConditions.$and.push({ $or: keywordOr });
    } else {
      matchConditions.$or = keywordOr;
    }
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
    const languageMatch = {
      $or: [
        { languages: { $in: filters.language } },
        { 'languageSkills.language': { $in: filters.language } },
      ],
    };
    if (matchConditions.$and) {
      matchConditions.$and.push(languageMatch);
    } else {
      matchConditions.$and = [languageMatch];
    }
  }
  if (filters.certification && filters.certification.length > 0) {
    const certMatch = {
      $or: [
        { professionalCertifications: { $in: filters.certification } },
        { 'verifiedCertificates.issuingBody': { $in: filters.certification } },
      ],
    };
    if (matchConditions.$and) {
      matchConditions.$and.push(certMatch);
    } else {
      matchConditions.$and = [certMatch];
    }
  }
  if (filters.verifiedOnly) {
    matchConditions['verifiedCertificates.verificationStatus'] = 'verified';
  }
  if (filters.experienceLevel && filters.experienceLevel.length > 0) {
    matchConditions.experienceLevel = { $in: filters.experienceLevel };
  }
  if (filters.sport && filters.sport.length > 0) {
    matchConditions.experienceAndSkill = { $in: filters.sport };
  }
  if (filters.availability && filters.availability.length > 0) {
    matchConditions.availability = { $in: filters.availability };
  }
  if (filters.preferredCountry && filters.preferredCountry.length > 0) {
    matchConditions.preferredWorkCountries = { $in: filters.preferredCountry };
  }
  if (filters.canWorkIn && filters.canWorkIn.length > 0) {
    matchConditions.workEligibleCountries = { $in: filters.canWorkIn };
  }
  if (filters.noSponsorshipIn && filters.noSponsorshipIn.length > 0) {
    matchConditions.canWorkWithoutSponsorshipIn = { $in: filters.noSponsorshipIn };
  }

  const sortKey = normalizeCandidateSortKey(filters.sort);
  const sortOrder: Record<string, 1 | -1> = {
    verifiedCertCount: -1,
    confirmedReferenceCount: -1,
  };
  switch (sortKey) {
    case 'oldest':
      sortOrder.createdAt = 1;
      break;
    case 'updated':
      sortOrder.updatedAt = -1;
      sortOrder.createdAt = -1;
      break;
    case 'created':
      sortOrder.createdAt = -1;
      break;
    case 'last_active':
    default:
      sortOrder.lastActiveAt = -1;
      sortOrder.updatedAt = -1;
      break;
  }

  const page = filters.page || 1;
  const skip = (page - 1) * PAGE_SIZE;
  // Cap sort window so MongoDB can use "top N" optimization and stay under 32MB (works without allowDiskUse)
  const sortWindow = Math.min(skip + PAGE_SIZE, 10000);

  // Job-seeker role filter + lastOnline for activity-based sort (single user lookup)
  const roleFilterStages = [
    {
      $lookup: {
        from: 'users',
        localField: 'jobSeeker',
        foreignField: '_id',
        as: 'jobSeekerInfo',
        pipeline: [
          { $match: { role: 'job-seeker' } },
          { $project: { _id: 1, name: 1, email: 1, lastOnline: 1 } },
          { $limit: 1 },
        ],
      },
    },
    { $match: { jobSeekerInfo: { $ne: [] } } },
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
        nationalityCountry: 1,
        preferredWorkCountries: 1,
        workEligibleCountries: 1,
        featured: 1,
        featuredUntil: 1,
        updatedAt: 1,
        createdAt: 1,
        pictures: { $slice: ['$pictures', 1] },
        jobSeeker: 1,
        profileSchemaVersion: 1,
        verifiedCertificates: 1,
        seasonalExperience: 1,
      }
    },
    {
      $addFields: {
        verifiedCertCount: {
          $size: {
            $filter: {
              input: { $ifNull: ['$verifiedCertificates', []] },
              as: 'cert',
              cond: { $eq: ['$$cert.verificationStatus', 'verified'] },
            },
          },
        },
        confirmedReferenceCount: {
          $size: {
            $filter: {
              input: { $ifNull: ['$seasonalExperience', []] },
              as: 'exp',
              cond: { $eq: ['$$exp.verificationStatus', 'confirmed'] },
            },
          },
        },
        verifiedCertLabels: {
          $map: {
            input: {
              $slice: [
                {
                  $filter: {
                    input: { $ifNull: ['$verifiedCertificates', []] },
                    as: 'cert',
                    cond: { $eq: ['$$cert.verificationStatus', 'verified'] },
                  },
                },
                2,
              ],
            },
            as: 'cert',
            in: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$$cert.issuingBody', ''] },
                    ' ',
                    { $ifNull: ['$$cert.certificateLevel', ''] },
                  ],
                },
              },
            },
          },
        },
        // Featured for display/sort: stored featured OR featuredUntil in the future (CV boost)
        isFeatured: {
          $cond: [
            {
              $or: [
                { $eq: ['$featured', true] },
                {
                  $and: [
                    { $ne: ['$featuredUntil', null] },
                    { $gt: ['$featuredUntil', '$$NOW'] },
                  ],
                },
              ],
            },
            true,
            false,
          ],
        },
      }
    },
    {
      $addFields: {
        jobSeekerInfo: { $arrayElemAt: ['$jobSeekerInfo', 0] },
      },
    },
    {
      $addFields: {
        lastActiveAt: {
          $ifNull: ['$jobSeekerInfo.lastOnline', '$updatedAt', '$createdAt'],
        },
      },
    },
    { $sort: { isFeatured: -1, ...sortOrder } },
    { $limit: sortWindow }, // Bounded sort: only keep sortWindow docs in memory (avoids 32MB limit)
    { $skip: skip },
    { $limit: PAGE_SIZE },
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
        nationalityCountry: 1,
        preferredWorkCountries: 1,
        workEligibleCountries: 1,
        featured: '$isFeatured',
        pictures: 1,
        profileSchemaVersion: 1,
        verifiedCertCount: 1,
        confirmedReferenceCount: 1,
        verifiedCertLabels: 1,
        createdAt: 1,
        updatedAt: 1,
        jobSeeker: {
          _id: '$jobSeekerInfo._id',
          name: '$jobSeekerInfo.name',
          email: '$jobSeekerInfo.email',
          lastOnline: '$jobSeekerInfo.lastOnline',
        },
      },
    },
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
        preferredWorkCountries: 1,
        workEligibleCountries: 1,
        verifiedCertificates: 1,
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
  const uniquePreferredCountries = new Set<string>();
  const uniqueEligibleCountries = new Set<string>();

  allMatchingCvs.forEach((cv: any) => {
    if (cv.languages) cv.languages.forEach((lang: string) => uniqueLanguages.add(lang));
    if (cv.lookingForWorkInAreas) cv.lookingForWorkInAreas.forEach((area: string) => uniqueWorkAreas.add(area));
    if (cv.experienceAndSkill) cv.experienceAndSkill.forEach((sport: string) => uniqueSports.add(sport));
    if (cv.professionalCertifications) cv.professionalCertifications.forEach((cert: string) => uniqueCertifications.add(cert));
    if (cv.verifiedCertificates) {
      cv.verifiedCertificates.forEach((cert: { issuingBody?: string }) => {
        if (cert?.issuingBody) uniqueCertifications.add(cert.issuingBody);
      });
    }
    if (cv.experienceLevel) uniqueExperienceLevels.add(cv.experienceLevel);
    if (cv.availability) uniqueAvailability.add(cv.availability);
    if (cv.preferredWorkCountries) {
      cv.preferredWorkCountries.forEach((code: string) => uniquePreferredCountries.add(code));
    }
    if (cv.workEligibleCountries) {
      cv.workEligibleCountries.forEach((code: string) => uniqueEligibleCountries.add(code));
    }
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
      preferredCountries: Array.from(uniquePreferredCountries).sort(),
      eligibleCountries: Array.from(uniqueEligibleCountries).sort(),
    },
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: totalCount,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    }
  };
}
