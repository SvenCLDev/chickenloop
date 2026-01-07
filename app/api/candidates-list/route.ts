import { NextRequest, NextResponse } from 'next/server';
import CV from '@/models/CV';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { parseCandidateSearchParams } from '@/lib/candidateSearchParams';

// GET - Get all CVs (recruiters and admins only)
export async function GET(request: NextRequest) {
  console.log('API: /api/candidates-list called');
  try {
    const user = requireRole(request, ['recruiter', 'admin']);
    console.log('API: /api/candidates-list - User authorized:', user.email);

    await connectDB();
    console.log('API: /api/candidates-list - DB connected');

    // Parse canonical candidate search parameters
    const { searchParams } = new URL(request.url);
    const filters = parseCandidateSearchParams(searchParams);

    console.log('API: /api/candidates-list - Querying CVs with filters:', {
      kw: filters.kw || null,
      location: filters.location || null,
      workArea: filters.workArea || null,
      language: filters.language || null,
      sport: filters.sport || null,
      certification: filters.certification || null,
      experienceLevel: filters.experienceLevel || null,
      availability: filters.availability || null,
      page: filters.page || null,
      sort: filters.sort || null,
    });

    // Build match conditions
    const matchConditions: any = {
      published: { $ne: false }
    };

    // Keyword filter: free-text search in multiple fields
    // Searches: CV title/headline (fullName), skills (experienceAndSkill), certifications (professionalCertifications),
    // profile summary (summary), work area (lookingForWorkInAreas), and past job titles (experience.position)
    if (filters.kw) {
      const keywordRegex = new RegExp(filters.kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const keywordOr: any[] = [
        { fullName: keywordRegex }, // CV title/headline
        { summary: keywordRegex }, // Profile summary
        { experienceAndSkill: keywordRegex }, // Skills
        { professionalCertifications: keywordRegex }, // Certifications
        { lookingForWorkInAreas: keywordRegex }, // Work area
      ];
      
      // Search in past job titles (experience.position) - need to use $elemMatch for array of objects
      keywordOr.push({ 'experience.position': keywordRegex });
      
      matchConditions.$or = keywordOr;
    }

    // Location filter: semantic search against address field
    if (filters.location) {
      const trimmedLocation = filters.location.trim();
      if (trimmedLocation.length >= 2 && trimmedLocation.length <= 100) {
        const escapedLocation = trimmedLocation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const locationRegex = new RegExp(escapedLocation, 'i');
        
        // If keyword filter already exists, combine with $and
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

    // Work area filter: exact match in lookingForWorkInAreas array (multi-select)
    if (filters.workArea && filters.workArea.length > 0) {
      matchConditions.lookingForWorkInAreas = { $in: filters.workArea };
    }

    // Language filter: exact match in languages array (multi-select)
    if (filters.language && filters.language.length > 0) {
      matchConditions.languages = { $in: filters.language };
    }

    // Sport filter: exact match in experienceAndSkill array (multi-select)
    if (filters.sport && filters.sport.length > 0) {
      matchConditions.experienceAndSkill = { $in: filters.sport };
    }

    // Certification filter: exact match in professionalCertifications array (multi-select)
    if (filters.certification && filters.certification.length > 0) {
      matchConditions.professionalCertifications = { $in: filters.certification };
    }

    // Experience level filter: exact-value matching, multi-select support
    if (filters.experienceLevel && filters.experienceLevel.length > 0) {
      matchConditions.experienceLevel = { $in: filters.experienceLevel };
    }

    // Availability filter: exact-value matching, multi-select support
    if (filters.availability && filters.availability.length > 0) {
      matchConditions.availability = { $in: filters.availability };
    }

    // Determine sort order
    const sortOrder: any = {};
    if (filters.sort === 'oldest') {
      sortOrder.createdAt = 1; // Ascending (oldest first)
    } else {
      sortOrder.createdAt = -1; // Descending (newest first, default)
    }

    // Use aggregation with optimized $lookup for better performance
    // Only select fields needed for the listing page
    const startTime = Date.now();
    
    const aggregationPipeline: any[] = [
      // Match published CVs and apply filters (uses compound index)
      {
        $match: matchConditions
      },
      // Sort by createdAt (uses index) - do this early
      {
        $sort: sortOrder
      },
      // Project CV fields first to reduce data size before lookup
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
          pictures: { $slice: ['$pictures', 1] }, // Only first picture
          createdAt: 1,
          jobSeeker: 1 // Keep for lookup
        }
      },
      // Lookup jobSeeker info with limited fields only (after reducing CV data)
      {
        $lookup: {
          from: 'users',
          localField: 'jobSeeker',
          foreignField: '_id',
          as: 'jobSeekerInfo',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                lastOnline: 1
              }
            }
          ]
        }
      },
      // Unwind jobSeeker array (should be single element)
      {
        $unwind: {
          path: '$jobSeekerInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      // Final projection with jobSeeker data
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

    // Get total count before pagination (for pagination metadata)
    const countPipeline = [
      { $match: matchConditions },
      { $count: 'total' }
    ];
    const countResult = await CV.aggregate(countPipeline).allowDiskUse(true);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    // Apply pagination if specified
    const page = filters.page || 1;
    const pageSize = 20; // Default page size
    const skip = (page - 1) * pageSize;
    
    if (skip > 0) {
      aggregationPipeline.push({ $skip: skip });
    }
    aggregationPipeline.push({ $limit: pageSize });

    // Extract unique values for filters from ALL matching CVs (before pagination)
    // This ensures filter options reflect all available values, not just current page
    const filterExtractionPipeline = [
      { $match: matchConditions },
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
    
    const allMatchingCvs = await CV.aggregate(filterExtractionPipeline).allowDiskUse(true);
    
    const uniqueLanguages = new Set<string>();
    const uniqueWorkAreas = new Set<string>();
    const uniqueSports = new Set<string>();
    const uniqueCertifications = new Set<string>();
    const uniqueExperienceLevels = new Set<string>();
    const uniqueAvailability = new Set<string>();

    allMatchingCvs.forEach((cv: any) => {
      if (cv.languages) {
        cv.languages.forEach((lang: string) => uniqueLanguages.add(lang));
      }
      if (cv.lookingForWorkInAreas) {
        cv.lookingForWorkInAreas.forEach((area: string) => uniqueWorkAreas.add(area));
      }
      if (cv.experienceAndSkill) {
        cv.experienceAndSkill.forEach((sport: string) => uniqueSports.add(sport));
      }
      if (cv.professionalCertifications) {
        cv.professionalCertifications.forEach((cert: string) => uniqueCertifications.add(cert));
      }
      if (cv.experienceLevel) {
        uniqueExperienceLevels.add(cv.experienceLevel);
      }
      if (cv.availability) {
        uniqueAvailability.add(cv.availability);
      }
    });

    // Now get the paginated results
    const cvs = await CV.aggregate(aggregationPipeline).allowDiskUse(true);

    const queryTime = Date.now() - startTime;
    console.log(`API: /api/candidates-list - Found ${cvs.length} CVs (page ${page}, total ${totalCount}) in ${queryTime}ms`);

    return NextResponse.json({
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
        page: page,
        pageSize: pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      }
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('API: /api/candidates-list - Error:', error);
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

