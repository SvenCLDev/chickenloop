# ChickenLoop – Project Brief

## 1. Project Overview

**Product**  
ChickenLoop is a niche job board and lightweight Applicant Tracking System (ATS) focused on watersports and outdoor sports professionals.

**Audience**  
- Job seekers: instructors, coaches, and seasonal sports professionals  
- Employers: watersports schools, resorts, clubs, and recruiters

**Core Value Proposition**  
- High-quality, niche job listings with strong SEO (Google Jobs)  
- Simple ATS tools for small employers (status tracking, pipelines, direct applications)  
- Structured data and search optimized specifically for sports jobs

---

## 2. Tech Stack

### Frontend
- **Framework:** Next.js (App Router)  
- **Language:** TypeScript  
- **Styling:** Tailwind CSS  
- **Rendering:** Server Components + client components where needed

### Backend
- **Runtime:** Node.js  
- **API:** Next.js Route Handlers (`app/api/...`)  
- **Business logic:** Co-located in API routes (no separate backend service)

### Database / Search
- **Database:** MongoDB  
- **ODM:** Mongoose  
- **Search:** MongoDB text search + custom filtering logic (primary vs secondary fields)

### Hosting / Deployment
- **Platform:** Vercel  
- **Preview deployments:** Per branch / PR  
- **Production:** Auto-deploy from upstream `main`

### Auth / Email / Third‑Party
- **Auth:** Custom auth (email-based, role-aware)  
- **Email:** Transactional email (applications, alerts, notifications)  
- **SEO:** Google JobPosting via JSON‑LD

---

## 3. Repository & Git Structure

### Repositories
- **Production (upstream):** `chickenloop3845-commits/chickenloop`  
- **Development fork:** `SvenCLDev/chickenloop`

### Branches
- `upstream/main` → **Production source of truth**  
- `origin/main` (sven/main) → Fork main, mirrors upstream after PR merge  
- Feature branches (e.g. `2026Jan08`, `ATS`, future `email-alerts`)

### Merge / Deployment Strategy
- All work happens on feature branches in the fork  
- Feature branches merge into `origin/main`  
- **PR required:** `origin/main` → `upstream/main`  
- Merging PR triggers Vercel production deployment

---

## 4. Core Domain Concepts

### Job Postings
- Canonical job pages with stable URLs  
- Rich metadata: location, employment type, languages, qualifications  
- JSON‑LD `JobPosting` embedded server-side

### Candidate Profiles
- CV / resume creation  
- Searchable by recruiters  
- Skills, certifications, languages as structured fields

### ATS Concepts
- Application entity linking candidate ↔ job  
- Status lifecycle (pipeline stages): applied → reviewed → shortlisted → rejected / hired  
- Admin and recruiter-specific actions (archive, status updates)

### Employers / Recruiters
- Company profiles  
- Job posting management  
- Application inbox per job

### Search & Filtering Logic
- **Primary fields:** must match core search intent (role, discipline, location)  
- **Secondary fields:** boost/re-rank results but must not widen scope incorrectly

---

## 5. Implemented Features (Current State)

### Built & Working
- Job posting CRUD  
- Public job pages  
- Candidate applications (email & platform-based)  
- Recruiter dashboard for applications  
- ATS status updates  
- JSON‑LD for Google Jobs  
- Vercel previews and prod pipeline

### Partially Implemented
- Candidate ↔ job matching logic  
- Recruiter-side filtering and sorting  
- Search consistency between jobs and candidates

### Explicitly Deferred
- Paid plans / billing  
- Advanced analytics  
- Employer automation beyond basic ATS

---

## 6. Key Design Decisions & Constraints

- **Next.js App Router is mandatory** (no Pages Router)  
- **SEO-first:** Job pages must be crawlable, stable, and indexable  
- JSON‑LD must be server-rendered (not client-only)  
- No breaking changes to job URLs once published  
- ATS must remain simple (SMB / seasonal employer focus)

---

## 7. Known Problems & Technical Debt

- Inconsistencies between job search and candidate search logic  
- Some TypeScript looseness in API routes (null vs undefined issues)  
- Middleware → proxy migration required (Next.js deprecation)  
- Some schemas mix string/ObjectId representations

---

## 8. Open Tasks / Next Planned Features

### Short-Term Priorities
- Email alerts for jobs and candidates  
- Google Jobs validation and monitoring  
- Search logic cleanup (primary vs secondary fields)

### Dependencies
- Email alerts depend on stable ATS status logic  
- Search improvements depend on schema normalization

---

## 9. Things You Must Not Forget in Future Chats

- **Production deploys ONLY from `upstream/main`**  
- Preview URLs are not crawlable by Google  
- Google Jobs testing must use prod or publicly accessible URLs  
- Feature branches may depend on unmerged ATS work  
- Avoid diverging `origin/main` from `upstream/main` after PR merge

---

**This document is authoritative context for all future ChatGPT sessions related to ChickenLoop.**

