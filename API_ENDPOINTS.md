# API Endpoints Reference

This document lists all API endpoints available in the Chickenloop application.

## Authentication APIs (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/me` | Get current user info | Yes |

## Job APIs (`/api/jobs`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/jobs` | Get all jobs (supports `?featured=true`) | No | - |
| GET | `/api/jobs-list` | Get all jobs (supports `?featured=true`) | No | - |
| GET | `/api/jobs/my` | Get current user's jobs | Yes | Recruiter |
| GET | `/api/jobs/[id]` | Get job by ID | No | - |
| POST | `/api/jobs` | Create a new job | Yes | Recruiter |
| PUT | `/api/jobs/[id]` | Update a job | Yes | Recruiter (owner) |
| DELETE | `/api/jobs/[id]` | Delete a job | Yes | Recruiter (owner) |
| POST | `/api/jobs/[id]/favourite` | Toggle favourite status | Yes | Job Seeker |
| GET | `/api/jobs/[id]/favourite` | Check favourite status | Yes | Job Seeker |
| GET | `/api/jobs/favourites` | Get user's favourite jobs | Yes | Job Seeker |
| POST | `/api/jobs/[id]/report-spam` | Report a job as spam | Yes | - |
| POST | `/api/jobs/upload` | Upload job images | Yes | Recruiter |

## Company APIs (`/api/company` and `/api/companies`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/company` | Get current user's company | Yes | Recruiter |
| POST | `/api/company` | Create a company | Yes | Recruiter |
| PUT | `/api/company` | Update current user's company | Yes | Recruiter (owner) |
| DELETE | `/api/company` | Delete current user's company | Yes | Recruiter (owner) |
| POST | `/api/company/upload` | Upload company pictures | Yes | Recruiter |
| GET | `/api/companies/[id]` | Get company by ID (public) | No | - |
| GET | `/api/companies-list` | Get all companies (supports `?featured=true`) | No | - |

## CV/Resume APIs (`/api/cv`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/cv` | Get current user's CV | Yes | Job Seeker |
| POST | `/api/cv` | Create a CV | Yes | Job Seeker |
| PUT | `/api/cv` | Update current user's CV | Yes | Job Seeker |
| DELETE | `/api/cv` | Delete current user's CV | Yes | Job Seeker |
| POST | `/api/cv/upload` | Upload CV documents | Yes | Job Seeker |
| POST | `/api/cv/toggle-publish` | Toggle CV publish status | Yes | Job Seeker |

## Candidate APIs (`/api/candidates-list`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/candidates-list` | Get all candidates (CVs) | Yes | Recruiter |
| GET | `/api/candidates-list/[id]` | Get candidate by ID | Yes | Recruiter |
| POST | `/api/candidates-list/[id]/favourite` | Toggle favourite candidate | Yes | Recruiter |
| GET | `/api/candidates-list/[id]/favourite` | Check favourite status | Yes | Recruiter |
| GET | `/api/candidates-list/favourites` | Get favourite candidates | Yes | Recruiter |

## Account APIs (`/api/account`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| PUT | `/api/account` | Update account info (name, email) | Yes |
| DELETE | `/api/account` | Delete account | Yes |
| POST | `/api/account/change-password` | Change password | Yes |

## Admin APIs (`/api/admin`)

### Users Management

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/admin/users` | Get all users | Yes | Admin |
| GET | `/api/admin/users/[id]` | Get user by ID | Yes | Admin |
| PUT | `/api/admin/users/[id]` | Update user | Yes | Admin |
| DELETE | `/api/admin/users/[id]` | Delete user | Yes | Admin |

### Jobs Management

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/admin/jobs` | Get all jobs | Yes | Admin |
| PUT | `/api/admin/jobs/[id]` | Update job | Yes | Admin |
| DELETE | `/api/admin/jobs/[id]` | Delete job | Yes | Admin |

### Companies Management

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/admin/companies` | Get all companies | Yes | Admin |
| GET | `/api/admin/companies/[id]` | Get company by ID | Yes | Admin |
| PUT | `/api/admin/companies/[id]` | Update company (supports featured-only updates) | Yes | Admin |
| DELETE | `/api/admin/companies/[id]` | Delete company | Yes | Admin |

### Audit Logs

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/api/admin/audit-logs` | Get audit logs (supports query params: `limit`, `offset`, `action`, `entityType`, `userId`) | Yes | Admin |

## Utility APIs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/contact` | Send contact form | No |
| POST | `/api/cookie-consent/log` | Log cookie consent | No |
| POST | `/api/geocode` | Geocode an address | No |
| GET | `/api/geocode/search` | Search for locations | No |

## Query Parameters

### Featured Filter
- `?featured=true` - Filter for featured items
  - Supported on: `/api/jobs`, `/api/jobs-list`, `/api/companies-list`

### Pagination (Admin APIs)
- `?limit=N` - Limit number of results
- `?offset=N` - Skip N results

### Audit Log Filters
- `?action=ACTION` - Filter by action type
- `?entityType=TYPE` - Filter by entity type
- `?userId=ID` - Filter by user ID

## Notes

- All API endpoints are prefixed with `/api`
- Authentication is handled via cookies (credentials: 'include')
- Admin endpoints require `role: 'admin'` in the user object
- Recruiter endpoints require `role: 'recruiter'` in the user object
- Job Seeker endpoints require `role: 'job-seeker'` in the user object
- Some endpoints support both authenticated and anonymous access (e.g., viewing jobs)






