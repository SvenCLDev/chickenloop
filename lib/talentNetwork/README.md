# Verified Talent Network — internal QA checklist

Use this checklist on **staging/preview** with `TALENT_NETWORK_ENABLED=true` before production cutover.

## Setup

- [ ] Set `TALENT_NETWORK_ENABLED=true` in environment
- [ ] Enable **Talent Network beta** on test job-seeker accounts (Admin → Edit User)
- [ ] Confirm admin can open `/admin/verification` and `/admin/cvs/[id]/edit`

## Non-beta users (must remain unchanged)

- [ ] Regular job seeker still uses `/job-seeker/cv/edit` and `/job-seeker/cv/new`
- [ ] Legacy CV save/load works without v2 fields
- [ ] Recruiter search and detail for v1 profiles unchanged

## Beta job seekers

- [ ] Dashboard links to `/job-seeker/cv/talent-network/edit` or `/new`
- [ ] `/job-seeker/cv/view` shows verification summary (pending vs verified) for v2 profiles
- [ ] v2 editor hides education, free-text skills, legacy certification checkboxes
- [ ] Certificate upload → status `pending_review`
- [ ] Work experience with manager email triggers reference email (check Resend logs)
- [ ] Reference email buttons open `/reference/confirm/[token]` on the **same deployment** (Preview links must not use `www.chickenloop.com` unless that DB holds the token)
- [ ] Manager can confirm via email buttons or the public confirm page
- [ ] Language proficiency saves correctly

## Admin verification

- [ ] Pending certificate appears in `/admin/verification`
- [ ] Verify button sets status to `verified` and records admin metadata
- [ ] Reject returns certificate to `unverified`

## Recruiter view

- [ ] v2 profile (`profileSchemaVersion: 2`) shows Talent Network sections on `/candidates/[id]`
- [ ] Green **Chickenloop Verified** badge on verified certificates
- [ ] **Verified reference** checkmark on confirmed work history
- [ ] Candidate card shows verified cert count when applicable
- [ ] `verified_only=true` search param filters correctly

## Migration

- [ ] `npx tsx scripts/migrateCvToTalentNetwork.ts --dry-run` on staging snapshot
- [ ] Live migration on beta accounts only
- [ ] Legacy DB fields remain intact after migration

## Rollback

- [ ] Unset `talentNetworkBeta` on test account → user returns to legacy editor
- [ ] v2 data remains in DB (no data loss)

## Unaffected features

- [ ] CV publish toggle
- [ ] CV boost / Stripe webhook
- [ ] Recruiter favourites
- [ ] Job applications / contact candidate flow

## Admin stats panel

- [ ] `/admin/verification` shows counts: pending certs, verified certs, confirmed references, beta users

## Production cutover (Phase 7 only)

- [ ] Run `migrateCvToTalentNetwork.ts --all`
- [ ] Confirm redirects: `/job-seeker/cv/edit` → talent-network editor
- [ ] Announce via marketing banner if desired
