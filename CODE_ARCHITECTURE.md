# ChickenLoop Code Architecture Guide

This document explains the internal code architecture and functionality of the ChickenLoop platform.

## Table of Contents

- [Overview](#overview)
- [Core Architecture](#core-architecture)
- [Authentication System](#authentication-system)
- [Database Layer](#database-layer)
- [Data Models](#data-models)
- [API Routes](#api-routes)
- [Security Considerations](#security-considerations)

## Overview

ChickenLoop is a Next.js 16 application built with the App Router pattern. It uses:
- **MongoDB** for data persistence
- **JWT tokens** for authentication
- **HTTP-only cookies** for session management
- **Serverless functions** on Vercel
- **TypeScript** for type safety

## Core Architecture

### Technology Stack

```
Frontend:
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS

Backend:
- Next.js API Routes
- MongoDB (via Mongoose)
- JWT authentication
- bcrypt for password hashing

Deployment:
- Vercel (serverless functions)
- Vercel Blob Storage (images)
- MongoDB Atlas (database)
```

### Directory Structure

```
/app
  /api              # API routes (serverless functions)
    /auth           # Authentication endpoints
    /jobs           # Job CRUD operations
    /cv             # CV/resume management
    /company        # Company profile management
    /admin          # Admin operations
  /(role-pages)     # Role-specific UI pages
  /components       # Reusable React components

/lib                # Utility libraries
  auth.ts           # Authentication utilities
  jwt.ts            # JWT token management
  db.ts             # Database connection
  api.ts            # API client functions

/models             # Mongoose data models
  User.ts           # User accounts
  Job.ts            # Job listings
  CV.ts             # Job seeker resumes
  Company.ts        # Company profiles
```

## Authentication System

### How It Works

ChickenLoop uses a **JWT-based authentication** system with HTTP-only cookies:

1. **Registration** (`POST /api/auth/register`):
   - User submits email, password, name, and role
   - Password is hashed using bcrypt (10 salt rounds)
   - User document created in MongoDB
   - JWT token generated and set as HTTP-only cookie
   - User automatically logged in

2. **Login** (`POST /api/auth/login`):
   - User submits email and password
   - System finds user by email
   - Password verified using bcrypt.compare()
   - JWT token generated with user info
   - Token stored in HTTP-only cookie (7-day expiration)
   - User's `lastOnline` timestamp updated

3. **Token Verification**:
   - Every protected API route calls `requireAuth()` or `requireRole()`
   - Token extracted from cookie or Authorization header
   - JWT verified using secret key
   - User information decoded from payload
   - Access granted or denied based on role

### JWT Payload Structure

```typescript
{
  userId: string;    // MongoDB ObjectId as string
  email: string;     // User's email
  role: string;      // 'recruiter', 'job-seeker', or 'admin'
  iat: number;       // Issued at (Unix timestamp)
  exp: number;       // Expires at (Unix timestamp)
}
```

### Authentication Utilities

Located in `lib/auth.ts`:

- **`getTokenFromRequest()`** - Extracts JWT from cookie or header
- **`verifyAuth()`** - Verifies token, returns user info or null
- **`requireAuth()`** - Throws error if not authenticated
- **`requireRole(roles)`** - Throws error if user lacks required role

### Security Features

- HTTP-only cookies (prevent XSS attacks)
- HTTPS-only in production (`secure: true`)
- SameSite cookie attribute (CSRF protection)
- Password hashing with bcrypt
- No password in API responses
- Token expiration (7 days)

## Database Layer

### Connection Management

Located in `lib/db.ts`:

The database connection uses **connection pooling** optimized for serverless:

```typescript
// Cached globally to persist across function invocations
global.mongoose = {
  conn: null,      // Active connection
  promise: null    // Pending connection promise
}
```

**Key Features**:
- Connection reuse across serverless invocations
- Automatic reconnection on failure
- Different timeouts for local vs. cloud MongoDB
- Stale connection detection (5-second timeout)
- Connection pool sizing (10-15 connections)

**Connection Flow**:
1. Check if cached connection exists and is ready
2. If not, create new connection promise
3. Wait for connection with timeout
4. Cache connection for future requests
5. Return Mongoose instance

## Data Models

All models are defined in `/models` directory using Mongoose.

### User Model (`models/User.ts`)

Represents user accounts with three roles:

- **job-seeker**: Can create CVs, browse jobs, save favorites
- **recruiter**: Can post jobs, create company profiles
- **admin**: Full platform access

```typescript
interface IUser {
  email: string;                    // Unique, lowercase
  password: string;                 // Bcrypt hashed
  role: 'recruiter' | 'job-seeker' | 'admin';
  name: string;
  favouriteJobs?: ObjectId[];       // For job seekers
  favouriteCandidates?: ObjectId[]; // For recruiters
  lastOnline?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Job Model (`models/Job.ts`)

Represents job postings in the watersports industry:

```typescript
interface IJob {
  title: string;
  description: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'freelance';
  recruiter: ObjectId;              // Reference to User
  companyId?: ObjectId;             // Reference to Company
  languages?: string[];
  qualifications?: string[];
  sports?: string[];                // Watersports activities
  pictures?: string[];              // Blob Storage URLs
  published?: boolean;
  featured?: boolean;               // Premium listing
  visitCount?: number;
  // Application methods
  applyByEmail?: boolean;
  applyByWebsite?: boolean;
  applyByWhatsApp?: boolean;
  applicationEmail?: string;
  applicationWebsite?: string;
  applicationWhatsApp?: string;
}
```

**Indexes for performance**:
- `{ published: 1, createdAt: -1 }` - Published jobs by date
- `{ featured: 1, published: 1 }` - Featured jobs
- `{ recruiter: 1 }` - Jobs by recruiter
- `{ country: 1 }`, `{ type: 1 }` - Filtering

### CV Model (`models/CV.ts`)

Represents job seeker resumes:

```typescript
interface ICV {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  summary?: string;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
  }>;
  skills: string[];
  professionalCertifications?: string[];
  languages?: string[];
  pictures?: string[];              // Blob Storage URLs
  published?: boolean;              // Visible to recruiters
  jobSeeker: ObjectId;              // Reference to User
}
```

### Company Model (`models/Company.ts`)

Represents recruiter company profiles:

```typescript
interface ICompany {
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;              // ISO 3166-1 alpha-2
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  contact?: {
    email?: string;
    officePhone?: string;
    whatsapp?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    // ... other platforms
  };
  offeredActivities?: string[];    // Watersports activities
  offeredServices?: string[];
  logo?: string;                   // Blob Storage URL
  pictures?: string[];             // Max 3 images
  featured?: boolean;
  owner: ObjectId;                 // Reference to User (unique)
}
```

**Constraint**: Each recruiter can only have ONE company (unique owner).

## API Routes

All API routes are Next.js Route Handlers in `/app/api`.

### Authentication Routes

**POST /api/auth/register**
- Creates new user account
- Hashes password with bcrypt
- Auto-login with JWT cookie
- Returns user info (excludes password)

**POST /api/auth/login**
- Verifies email and password
- Issues JWT token in HTTP-only cookie
- Updates lastOnline timestamp
- Returns user info

**POST /api/auth/logout**
- Clears authentication cookie
- Simple, stateless logout

**GET /api/auth/me**
- Returns current user info
- Requires authentication

### Job Routes

**GET /api/jobs**
- Public access (no auth required)
- Returns all published jobs
- Supports `?featured=true` query param
- Uses MongoDB projections for performance

**GET /api/jobs/[id]**
- Public access
- Returns single job details
- Increments visitCount

**POST /api/jobs**
- Requires: `role: 'recruiter'`
- Creates new job listing
- Associates with recruiter's company if exists

**PUT /api/jobs/[id]**
- Requires: `role: 'recruiter'` + ownership
- Updates job listing
- Only owner can edit

**DELETE /api/jobs/[id]**
- Requires: `role: 'recruiter'` + ownership
- Deletes job listing

### CV Routes

**GET /api/cv**
- Requires: `role: 'job-seeker'`
- Returns current user's CV

**POST /api/cv**
- Requires: `role: 'job-seeker'`
- Creates new CV (one per user)

**PUT /api/cv**
- Requires: `role: 'job-seeker'`
- Updates existing CV

**DELETE /api/cv**
- Requires: `role: 'job-seeker'`
- Deletes CV

### Admin Routes

**GET /api/admin/users**
- Requires: `role: 'admin'`
- Lists all users with stats

**PUT /api/admin/users/[id]**
- Requires: `role: 'admin'`
- Updates any user

**DELETE /api/admin/users/[id]**
- Requires: `role: 'admin'`
- Deletes user and related data

**Similar patterns for**:
- `/api/admin/jobs` - Manage all jobs
- `/api/admin/companies` - Manage all companies
- `/api/admin/audit-logs` - View system logs

## Security Considerations

### Password Security
- Passwords hashed with bcrypt (10 rounds)
- Never returned in API responses
- Minimum password requirements enforced client-side

### Authentication Security
- HTTP-only cookies (no JavaScript access)
- Secure flag in production (HTTPS only)
- SameSite=lax (CSRF protection)
- 7-day token expiration

### Authorization
- Role-based access control (RBAC)
- Ownership verification for resources
- Separate auth utilities for each check

### Data Protection
- User can only access their own data
- Recruiters can't see other recruiters' data
- Published CVs visible to all recruiters
- Admins have full access (audit logged)

### API Security
- Input validation on all routes
- MongoDB query sanitization
- Error messages sanitized (no stack traces in production)
- Rate limiting (handled by Vercel)

### Image Security
- Images stored in Vercel Blob Storage
- URLs validated before storage
- File size limits enforced
- No direct file system access

## Performance Optimizations

### Database
- Connection pooling
- MongoDB indexes on frequently queried fields
- `.lean()` for read-only queries
- Projections to exclude heavy fields from list endpoints

### Caching
- Static assets cached with long TTLs
- API responses can use cache headers
- Connection cache for serverless

### Images
- Stored in Blob Storage (not in database)
- URLs instead of base64
- Next.js Image component for optimization
- Lazy loading for below-fold images

### Serverless
- Connection reuse across invocations
- Minimal cold start time
- Fast API responses (< 10 seconds)
- Proper error handling and timeouts

---

For more information, see:
- [README.md](./README.md) - Getting started guide
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Complete API reference
- [AGENTS.md](./AGENTS.md) - Deployment guidelines
