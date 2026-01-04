# Job Search Parameters - Canonical Definition

This document defines the canonical job search parameters used throughout the Chickenloop application. These parameters represent the single source of truth for job search state.

## Overview

Job search state is managed through URL query parameters. All job search functionality should use these exact parameter names to ensure consistency across the application.

## Supported Parameters

### `keyword` (string, optional)
- **Description**: Search term that matches job title, description, or company name
- **Example**: `?keyword=instructor`
- **Usage**: Free-text search across multiple job fields

### `location` (string, optional)
- **Description**: Semantic location search - searches both city (location field) and country fields with OR logic
- **Example**: `?location=Spain` (matches jobs in any city in Spain, or cities named "Spain")
- **Usage**: Free-text search that matches either city name OR country name/code
- **Note**: Can be used together with `city` parameter for combined filtering

### `country` (string, optional)
- **Description**: ISO 3166-1 alpha-2 country code
- **Example**: `?country=EG` (Egypt), `?country=US` (United States)
- **Format**: Two-letter uppercase country code
- **Usage**: Filters jobs by country

### `category` (string, optional)
- **Description**: Job category/occupational area filter
- **Example**: `?category=Instructor`
- **Usage**: Filters jobs by occupational area/category

### `activity` (string, optional)
- **Description**: Sports/activities filter
- **Example**: `?activity=Kitesurfing`
- **Note**: Maps to the `sport` field in the Job model
- **Usage**: Filters jobs by specific sport or activity

### `language` (string, optional)
- **Description**: Required language filter
- **Example**: `?language=English`
- **Usage**: Filters jobs that require a specific language

### `city` (string, optional)
- **Description**: Exact city filter - case-insensitive exact match on location field
- **Example**: `?city=Tarifa`
- **Usage**: Filters jobs to exact city match only
- **Note**: Can be used together with `location` parameter. When both are present:
  - `city` constrains location to exact city
  - `location` only searches country field (since location is already constrained)

## URL Format

Parameters can be combined in any order:

```
/jobs?keyword=instructor&location=Dahab&country=EG&activity=Kitesurfing&language=English
```

### Combining `location` and `city` Parameters

Both `location` (semantic search) and `city` (exact filter) can be used together:

```
/jobs?location=Spain&city=Tarifa
```

This will:
- Match jobs in Tarifa (exact city match from `city` parameter)
- AND match jobs where country matches "Spain" (from `location` parameter)

Result: Jobs in Tarifa, Spain only (not other cities in Spain)

## Implementation

The canonical definition is implemented in:
- **TypeScript Interface**: `lib/jobSearchParams.ts` - `JobSearchParams`
- **Parser Function**: `lib/jobSearchParams.ts` - `parseJobSearchParams()`
- **Builder Function**: `lib/jobSearchParams.ts` - `buildJobSearchQuery()`

## Usage Examples

### Parsing URL Parameters

```typescript
import { parseJobSearchParams } from '@/lib/jobSearchParams';
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
const params = parseJobSearchParams(searchParams);

// params.keyword
// params.location  // Semantic location search
// params.city      // Exact city filter
// params.country
// params.category
// params.activity
// params.language
```

### Building URL Query String

```typescript
import { buildJobSearchQuery, buildJobSearchUrl } from '@/lib/jobSearchParams';

const params = {
  keyword: 'instructor',
  location: 'Dahab',  // Semantic search: city OR country
  city: 'Tarifa',      // Exact city filter (can be combined with location)
  country: 'EG',
  activity: 'Kitesurfing'
};

const queryString = buildJobSearchQuery(params);
// Returns: "keyword=instructor&location=Dahab&city=Tarifa&country=EG&activity=Kitesurfing"

const url = buildJobSearchUrl('/jobs', params);
// Returns: "/jobs?keyword=instructor&location=Dahab&country=EG&activity=Kitesurfing"
```

## Migration Notes

- Existing code may use `sport` instead of `activity` in URLs
- The `activity` parameter maps to the `sport` field in the Job model
- Code should be migrated to use `activity` for consistency

## Reference Implementation

See `app/jobs/page.tsx` for the current implementation that uses these parameters.

