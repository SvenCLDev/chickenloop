import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Company from '@/models/Company';
import { requireAuth, requireRole } from '@/lib/auth';
import mongoose from 'mongoose';
import { CachePresets } from '@/lib/cache';
import { parseJobSearchParams } from '@/lib/jobSearchParams';
import { getCountryCodeFromName } from '@/lib/countryUtils';
import { JOB_CATEGORIES, categorySlugToLabel } from '@/src/constants/jobCategories';

// GET - Get all jobs (accessible to all users, including anonymous)
export async function GET(request: NextRequest) {
  try {
    console.log('[API /jobs] Starting request');
    console.log('[API /jobs] MONGODB_URI exists:', !!process.env.MONGODB_URI);

    // Add timeout for database connection
    const startTime = Date.now();
    const dbPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout after 15 seconds')), 15000)
    );

    console.log('[API /jobs] Attempting database connection...');
    await Promise.race([dbPromise, timeoutPromise]);
    const connectTime = Date.now() - startTime;
    console.log(`[API /jobs] Database connected in ${connectTime}ms`);

    // Verify connection is actually ready
    const readyState = mongoose.connection.readyState;
    console.log(`[API /jobs] Connection readyState: ${readyState} (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`);

    if (readyState !== 1) {
      throw new Error(`Database connection not ready. State: ${readyState}`);
    }

    // Verify db object exists
    const dbConnection = mongoose.connection.db;
    if (!dbConnection) {
      throw new Error('Database object not available after connection');
    }
    console.log(`[API /jobs] Database object available: ${!!dbConnection}, name: ${dbConnection.databaseName}`);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    
    // Parse canonical job search parameters
    const filters = parseJobSearchParams(searchParams);
    // Also support legacy 'sport' parameter for backward compatibility
    const activityValue = filters.activity || searchParams.get('sport') || null;

    console.log('[API /jobs] Querying jobs with filters:', {
      keyword: filters.keyword || null,
      location: filters.location || null,
      country: filters.country || null,
      category: filters.category || null,
      activity: activityValue || null,
      language: filters.language || null,
      city: filters.city || null,
      featured: featured || null,
    });

    const queryStart = Date.now();
    const fetchStart = Date.now();

    // Use the dbConnection we verified above
    if (!dbConnection) {
      throw new Error('Database connection not available');
    }

    const collection = dbConnection.collection('jobs');

    // Build MongoDB query filter
    const queryFilter: any = {};

    // Always filter for published jobs (exclude only where published is explicitly false)
    queryFilter.published = { $ne: false };

    // Featured filter
    if (featured === 'true') {
      queryFilter.featured = true;
    }

    // Keyword filter: free-text search in title, description, or company
    if (filters.keyword) {
      const keywordRegex = new RegExp(filters.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      queryFilter.$or = [
        { title: keywordRegex },
        { description: keywordRegex },
        { company: keywordRegex },
      ];
    }

    // Location filter: semantic search against city and country fields (OR logic)
    // This is the top search bar - searches both city and country fields semantically
    // Can be used together with city filter: when both are present, location search only checks country field
    if (filters.location) {
      // Safety guards: trim whitespace and validate minimum length
      const trimmedLocation = filters.location.trim();
      
      // Ignore input shorter than 2 characters to avoid expensive unindexed scans
      // Also limit maximum length to prevent regex DoS attacks
      if (trimmedLocation.length < 2 || trimmedLocation.length > 100) {
        // Skip location filter if too short or too long
        // This prevents expensive regex scans on unindexed fields
      } else {
        // Safely escape regex special characters to prevent regex injection
        const escapedLocation = trimmedLocation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const locationRegex = new RegExp(escapedLocation, 'i');
        
        // Build location OR conditions: always search both city and country fields
        // Both fields are indexed, so these queries will use indexes efficiently
        const locationOr: any[] = [
          { city: locationRegex }, // Search in city name (semantic/partial match) - uses city index
          { country: locationRegex }    // Search in country code (partial match) - uses country index
        ];
        
        // Also try to convert location search term to country code and search for that
        // This handles cases where user searches "Spain" but DB has "ES"
        const countryCode = getCountryCodeFromName(trimmedLocation);
        if (countryCode) {
          // Add exact match for country code (case-insensitive)
          // Country code is already safe (2 letters), but escape for consistency
          const escapedCode = countryCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const countryCodeRegex = new RegExp(`^${escapedCode}$`, 'i');
          locationOr.push({ country: countryCodeRegex });
        }
        
        // If keyword filter already exists, we need to use $and to combine both conditions
        if (queryFilter.$or && filters.keyword) {
          // Both keyword and location filters exist - combine with $and
          // Result: (keyword matches) AND (location OR country matches)
          const keywordOr = queryFilter.$or;
          delete queryFilter.$or;
          queryFilter.$and = [
            { $or: keywordOr },
            { $or: locationOr }
          ];
        } else {
          // Only location filter (or location + other non-$or filters) - use $or directly
          queryFilter.$or = locationOr;
        }
      }
    }

    // City filter: exact match (case-insensitive) on city field ONLY
    // This is the sidebar filter - provides precise city filtering
    // When combined with location search: (location = exact city) AND (country matches location search)
    // When used alone: (location = exact city)
    if (filters.city) {
      // Safety guards: trim whitespace and validate minimum length
      const trimmedCity = filters.city.trim();
      
      // Ignore input shorter than 2 characters to avoid expensive unindexed scans
      // Also limit maximum length to prevent regex DoS attacks
      if (trimmedCity.length < 2 || trimmedCity.length > 100) {
        // Skip city filter if too short or too long
        // This prevents expensive regex scans
      } else {
        // Safely escape regex special characters to prevent regex injection
        // Use case-insensitive exact match for city field
        const cityRegex = new RegExp(`^${trimmedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      
      // If location search is also present, combine with AND logic
      // Result: (city matches exactly) AND (country matches location search)
      if (filters.location) {
        // Location search is present - rebuild it to only check country field (not city)
        // Since city filter already constrains city, location search should only match country
        const escapedLocation = filters.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const locationRegex = new RegExp(escapedLocation, 'i');
        
        // Build country-only search conditions
        const countryOnlyOr: any[] = [
          { country: locationRegex } // Search in country code (partial match)
        ];
        
        // Also try to convert location search term to country code and search for that
        const countryCode = getCountryCodeFromName(filters.location);
        if (countryCode) {
          const escapedCode = countryCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const countryCodeRegex = new RegExp(`^${escapedCode}$`, 'i');
          countryOnlyOr.push({ country: countryCodeRegex });
        }
        
        // Check if location search $or is at top level or already in $and (from keyword combination)
        if (queryFilter.$or) {
          // Location search created $or at top level - replace it with country-only search
          delete queryFilter.$or;
          
          queryFilter.$and = queryFilter.$and || [];
          queryFilter.$and.push({ city: cityRegex });
          queryFilter.$and.push({ $or: countryOnlyOr });
        } else if (queryFilter.$and) {
          // Location search is already in $and (combined with keyword)
          // Find and replace the location search $or condition with country-only version
          const andIndex = queryFilter.$and.findIndex((condition: any) => condition.$or);
          if (andIndex !== -1) {
            // Replace the location search $or with country-only version
            queryFilter.$and[andIndex] = { $or: countryOnlyOr };
          }
          queryFilter.$and.push({ city: cityRegex });
        } else {
          // Should not happen if location search was processed, but handle it
          queryFilter.$and = [
            { city: cityRegex },
            { $or: countryOnlyOr }
          ];
        }
      } else if (queryFilter.$and) {
        // Other AND conditions exist (e.g., from keyword filter)
        queryFilter.$and.push({ city: cityRegex });
      } else {
        // No location search - just apply city filter directly
        queryFilter.city = cityRegex;
      }
      }
    }

    // Country filter: exact match (normalized to uppercase, as stored in DB)
    if (filters.country) {
      const countryUpper = filters.country.trim().toUpperCase();
      queryFilter.country = countryUpper;
    }

    // Category filter: exact match in occupationalAreas array
    if (filters.category) {
      queryFilter.occupationalAreas = filters.category;
    }

    // Activity filter: exact match in sports array (maps to 'sport' field in Job model)
    if (activityValue) {
      queryFilter.sports = activityValue;
    }

    // Language filter: exact match in languages array
    if (filters.language) {
      queryFilter.languages = filters.language;
    }

    // Query to get jobs - Project only fields needed for list display
    // Include description when keyword filter is present (for search), otherwise exclude for performance
    const listProjection: any = {
      _id: 1,
      title: 1,
      company: 1,
      city: 1,
      country: 1,
      salary: 1,
      type: 1,
      recruiter: 1,
      companyId: 1,
      sports: 1,
      occupationalAreas: 1,
      published: 1,
      featured: 1,
      pictures: 1, // Need for list thumbnails
      createdAt: 1,
      updatedAt: 1,
      languages: 1, // Needed for language filter
    };
    
    // Include description only if keyword filter is present (for search functionality)
    // Note: MongoDB can search description even without projecting it, but we include it
    // for potential client-side display of search highlights
    if (filters.keyword) {
      listProjection.description = 1;
    }

    console.log('[API /jobs] Executing find query with projection (excluding heavy fields)...');
    console.log('[API /jobs] Creating query cursor...');
    const queryCursor = collection.find(queryFilter)
      .project(listProjection)
      .hint({ published: 1, createdAt: -1 }) // Use the compound index for better performance
      .maxTimeMS(10000); // 10 second timeout should be plenty for local DB

    console.log('[API /jobs] Query cursor created, calling toArray()...');
    const simplestQueryPromise = queryCursor.toArray();

    const simplestTimeout = new Promise<any[]>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
    );

    let jobsWithoutPopulate: any[];
    try {
      console.log('[API /jobs] Starting Promise.race...');
      jobsWithoutPopulate = await Promise.race([simplestQueryPromise, simplestTimeout]);
      const fetchTime = Date.now() - fetchStart;
      console.log(`[API /jobs] Simplest query succeeded, got ${jobsWithoutPopulate.length} jobs in ${fetchTime}ms`);

      // Filter on client side
      jobsWithoutPopulate = jobsWithoutPopulate.filter((job: any) => job.published !== false);
      console.log(`[API /jobs] Filtered to ${jobsWithoutPopulate.length} published jobs`);

      // Convert ObjectIds to strings
      jobsWithoutPopulate = jobsWithoutPopulate.map((job: any) => ({
        ...job,
        _id: job._id.toString(),
        recruiter: job.recruiter ? job.recruiter.toString() : null,
        companyId: job.companyId ? job.companyId.toString() : null,
      }));
    } catch (simpleError: any) {
      console.error('[API /jobs] Even simplest query failed:', simpleError.message);
      // If even the simplest query fails, return empty array
      console.log('[API /jobs] Returning empty jobs array');
      jobsWithoutPopulate = [];
    }
    const fetchTime = Date.now() - fetchStart;
    console.log(`[API /jobs] Fetched ${jobsWithoutPopulate.length} jobs in ${fetchTime}ms`);

    // Sort on client side (much faster than database sort)
    // Sort by updatedAt descending (most recently updated first)
    jobsWithoutPopulate.sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA; // Descending (newest first)
    });
    console.log(`[API /jobs] Sorted ${jobsWithoutPopulate.length} jobs on client side`);

    // Populate recruiter info using native MongoDB lookup
    let jobs = jobsWithoutPopulate;
    if (jobsWithoutPopulate.length > 0 && jobsWithoutPopulate[0].recruiter) {
      console.log('[API /jobs] Populating recruiter info with native lookup...');
      const populateStart = Date.now();
      try {
        const db = mongoose.connection.db;
        if (db) {
          const usersCollection = db.collection('users');
          const recruiterIds = [...new Set(jobsWithoutPopulate.map((j: any) => j.recruiter).filter(Boolean))];

          const recruiters = await usersCollection.find({
            _id: { $in: recruiterIds.map((id: string) => new mongoose.Types.ObjectId(id)) }
          })
            .project({ name: 1, email: 1 })
            .maxTimeMS(3000)
            .toArray();

          const recruiterMap = new Map(
            recruiters.map((r: any) => [r._id.toString(), { name: r.name, email: r.email }])
          );

          jobs = jobsWithoutPopulate.map((job: any) => ({
            ...job,
            recruiter: job.recruiter ? (recruiterMap.get(job.recruiter) || { _id: job.recruiter }) : null
          }));

          const populateTime = Date.now() - populateStart;
          console.log(`[API /jobs] Populated ${jobs.length} jobs in ${populateTime}ms`);
        } else {
          jobs = jobsWithoutPopulate;
        }
      } catch (populateError: any) {
        console.error('[API /jobs] Populate error:', populateError.message);
        // Continue without populate if it fails
        jobs = jobsWithoutPopulate;
      }
    }

    const queryTime = Date.now() - queryStart;
    console.log(`[API /jobs] Total query time: ${queryTime}ms`);

    // Add cache headers - jobs can be cached for 5 minutes with stale-while-revalidate
    const cacheHeaders = CachePresets.short();

    return NextResponse.json({ jobs }, {
      status: 200,
      headers: cacheHeaders,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/jobs:', error);
    // Provide more detailed error information
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('timed out');
    const isConnectionError = errorMessage.includes('connection') || errorMessage.includes('ENOTFOUND');

    return NextResponse.json(
      {
        error: errorMessage,
        details: isTimeout
          ? 'Database connection timed out. Please check your MongoDB Atlas network access settings.'
          : isConnectionError
            ? 'Cannot connect to database. Please verify your MongoDB Atlas connection string and network access.'
            : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// POST - Create a new job (recruiters only)
export async function POST(request: NextRequest) {
  try {
    const user = requireRole(request, ['recruiter']);
    await connectDB();

    const requestBody = await request.json();
    
    // Safeguard: Reject requests that include deprecated `location` field
    if (requestBody.location !== undefined) {
      return NextResponse.json(
        { error: 'The `location` field has been deprecated. Please use `city` instead.' },
        { status: 400 }
      );
    }
    
    // Safeguard: Reject requests that include system-managed date fields
    if (requestBody.datePosted !== undefined || requestBody.validThrough !== undefined) {
      return NextResponse.json(
        { error: 'The `datePosted` and `validThrough` fields are system-managed and cannot be set manually.' },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      company,
      city,
      country,
      salary,
      type,
      languages,
      qualifications,
      sports,
      occupationalAreas,
      pictures,
      applyByEmail,
      applyByWebsite,
      applyByWhatsApp,
      applicationEmail,
      applicationWebsite,
      applicationWhatsApp
    } = requestBody;

    // Validate required fields - check for empty strings and whitespace
    const requiredFields: { [key: string]: string } = {};
    if (!title || !title.trim()) requiredFields.title = 'Job Title';
    if (!description || !description.trim()) requiredFields.description = 'Description';
    if (!company || !company.trim()) requiredFields.company = 'Company';
    if (!city || !city.trim()) requiredFields.city = 'City';
    if (!country || !country.trim()) requiredFields.country = 'Country (ISO code)';
    if (!type || !type.trim()) requiredFields.type = 'Employment Type';
    if (!occupationalAreas || !Array.isArray(occupationalAreas) || occupationalAreas.length === 0) {
      requiredFields.category = 'Job Category';
    }
    
    if (Object.keys(requiredFields).length > 0) {
      const missingFields = Object.values(requiredFields).join(', ');
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields}` },
        { status: 400 }
      );
    }

    // Validate pictures array length
    if (pictures !== undefined && Array.isArray(pictures) && pictures.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 pictures allowed' },
        { status: 400 }
      );
    }

    // Validate job categories - ensure all categories are in JOB_CATEGORIES
    if (occupationalAreas !== undefined && Array.isArray(occupationalAreas)) {
      const invalidCategories = occupationalAreas.filter(
        (category: string) => !JOB_CATEGORIES.includes(category as any)
      );
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          { message: 'Invalid job category' },
          { status: 400 }
        );
      }
    }

    // Normalize country: trim and uppercase, or set to null if empty
    const normalizedCountry = country?.trim() ? country.trim().toUpperCase() : null;

    // Find the recruiter's company to set companyId
    const recruiterCompany = await Company.findOne({ owner: user.userId });
    const companyId = recruiterCompany ? recruiterCompany._id : undefined;

    // System-managed date fields for Google Jobs SEO
    // datePosted is set when job is first published
    // validThrough is set to datePosted + 90 days
    const now = new Date();
    const validThroughDate = new Date(now);
    validThroughDate.setDate(validThroughDate.getDate() + 90);

    const job = await Job.create({
      title,
      description,
      company,
      city,
      country: normalizedCountry,
      salary,
      type,
      recruiter: user.userId,
      companyId: companyId,
      languages: languages || [],
      qualifications: qualifications || [],
      sports: sports || [],
      occupationalAreas: occupationalAreas || [],
      pictures: pictures || [],
      applyByEmail: applyByEmail === true,
      applyByWebsite: applyByWebsite === true,
      applyByWhatsApp: applyByWhatsApp === true,
      applicationEmail: applicationEmail || undefined,
      applicationWebsite: applicationWebsite || undefined,
      applicationWhatsApp: applicationWhatsApp || undefined,
      published: true, // Jobs are published by default
      datePosted: now, // System-managed: set when first published
      validThrough: validThroughDate, // System-managed: datePosted + 90 days
    });

    const populatedJob = await Job.findById(job._id).populate('recruiter', 'name email');

    return NextResponse.json(
      { message: 'Job created successfully', job: populatedJob },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

