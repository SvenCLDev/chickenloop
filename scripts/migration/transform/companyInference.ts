/**
 * Company inference for migration (dry run).
 * Recruiter→job matching by email domain, organization name, or email local part.
 * job.ownerUid is NOT used. Drupal companies used only for optional enrichment.
 * Does NOT write to DB or upload files.
 */

/** Recruiter row from export (uid, name, mail). */
export interface RecruiterRow {
  uid: string | number;
  name?: string;
  mail?: string;
  [key: string]: unknown;
}

/** Company row from Drupal (used only for optional enrichment by domain/title). */
export interface CompanyRow {
  nid: string;
  title?: string;
  name?: string;
  website?: string;
  email?: string;
  [key: string]: unknown;
}

/** Job row from export (job_organization, job_website, job_email). ownerUid is ignored. */
export interface JobRow {
  job_organization?: string;
  job_website?: string;
  job_email?: string;
  organization?: string;
  [key: string]: unknown;
}

export type InferenceStrategy =
  | 'placeholder'
  | 'inferred_from_jobs'
  | 'inferred_and_enriched';

export interface CompanyInferenceResult {
  recruiterUid: string;
  strategy: InferenceStrategy;
  sourceCompanyNid: string | null;
  inferredName: string | null;
  confidence: number;
}

/** Summary counts derived from inference results and companies. */
export interface InferenceSummary {
  inferredFromJobs: number;
  enrichedFromDrupal: number;
  placeholders: number;
  ignoredDrupalCompanies: number;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function extractDomainFromUrl(url: string): string {
  const u = normalize(url);
  if (!u) return '';
  const withoutProtocol = u.replace(/^[a-z]+:\/\//i, '').trim();
  const host = withoutProtocol.split('/')[0] ?? '';
  const domain = host.split(':')[0] ?? '';
  return domain;
}

function extractDomainFromEmail(email: string): string {
  const e = normalize(email);
  if (!e || !e.includes('@')) return '';
  const part = e.split('@')[1] ?? '';
  return part.split(':')[0] ?? '';
}

function extractLocalPartFromEmail(email: string): string {
  const e = normalize(email);
  if (!e || !e.includes('@')) return '';
  return e.split('@')[0] ?? '';
}

function mostFrequentKey(counts: Map<string, number>): { value: string; count: number } | null {
  let bestValue = '';
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (value && count > bestCount) {
      bestCount = count;
      bestValue = value;
    }
  }
  return bestValue ? { value: bestValue, count: bestCount } : null;
}

function getRecruiterMailDomain(recruiter: RecruiterRow): string {
  const raw = recruiter.mail ?? '';
  return typeof raw === 'string' ? extractDomainFromEmail(raw) : '';
}

function getRecruiterNameNormalized(recruiter: RecruiterRow): string {
  const raw = recruiter.name ?? '';
  return typeof raw === 'string' ? normalize(raw) : '';
}

function getJobOrganization(job: JobRow): string {
  const raw = job.job_organization ?? job.organization ?? '';
  return typeof raw === 'string' ? normalize(raw) : '';
}

function getJobWebsiteDomain(job: JobRow): string {
  const raw = job.job_website ?? '';
  return typeof raw === 'string' ? extractDomainFromUrl(raw) : '';
}

function getJobEmailDomain(job: JobRow): string {
  const raw = job.job_email ?? '';
  return typeof raw === 'string' ? extractDomainFromEmail(raw) : '';
}

function getJobEmailLocalPart(job: JobRow): string {
  const raw = job.job_email ?? '';
  return typeof raw === 'string' ? extractLocalPartFromEmail(raw) : '';
}

function getCompanyTitleNormalized(company: CompanyRow): string {
  const raw = company.title ?? company.name ?? '';
  return typeof raw === 'string' ? normalize(raw) : '';
}

function getCompanyWebsiteDomain(company: CompanyRow): string {
  const raw = company.website ?? '';
  return typeof raw === 'string' ? extractDomainFromUrl(raw) : '';
}

function getCompanyEmailDomain(company: CompanyRow): string {
  const raw = company.email ?? '';
  return typeof raw === 'string' ? extractDomainFromEmail(raw) : '';
}

/**
 * True if job matches recruiter by any rule:
 * 1) Email domain match: domain(recruiter.mail) === domain(job.job_email)
 * 2) Organization name match: normalize(job.job_organization) === normalize(recruiter.name)
 * 3) Fallback: job.job_email local part contains recruiter.name (normalized)
 */
function jobMatchesRecruiter(job: JobRow, recruiter: RecruiterRow): boolean {
  const recruiterMailDomain = getRecruiterMailDomain(recruiter);
  const recruiterNameNorm = getRecruiterNameNormalized(recruiter);

  if (!recruiterMailDomain && !recruiterNameNorm) return false;

  const jobEmailDomain = getJobEmailDomain(job);
  const jobOrgNorm = getJobOrganization(job);
  const jobEmailLocal = getJobEmailLocalPart(job);

  if (recruiterMailDomain && jobEmailDomain && recruiterMailDomain === jobEmailDomain) return true;
  if (recruiterNameNorm && jobOrgNorm && recruiterNameNorm === jobOrgNorm) return true;
  if (recruiterNameNorm && jobEmailLocal && jobEmailLocal.includes(recruiterNameNorm)) return true;

  return false;
}

/**
 * For each recruiter, find jobs matching by email domain / org name / email local part.
 * Infer company name from most frequent job_organization, fallback to website/email domain.
 * Optional enrichment from Drupal companies. Does not write to DB or upload files.
 * job.ownerUid is not used.
 */
export function inferCompanies(
  recruiters: RecruiterRow[],
  companies: CompanyRow[],
  jobs: JobRow[]
): CompanyInferenceResult[] {
  const results: CompanyInferenceResult[] = [];

  for (const recruiter of recruiters) {
    const uid = String(recruiter.uid ?? '').trim();

    const recruiterJobs = jobs.filter((j) => jobMatchesRecruiter(j, recruiter));

    if (recruiterJobs.length === 0) {
      const recruiterName = typeof recruiter.name === 'string' ? recruiter.name.trim() : '';
      const displayName = recruiterName || `Recruiter ${uid}`;
      results.push({
        recruiterUid: uid,
        strategy: 'placeholder',
        sourceCompanyNid: null,
        inferredName: `${displayName} (Legacy)`,
        confidence: 0.1,
      });
      continue;
    }

    const orgCounts = new Map<string, number>();
    const websiteDomainCounts = new Map<string, number>();
    const emailDomainCounts = new Map<string, number>();

    for (const job of recruiterJobs) {
      const org = getJobOrganization(job);
      if (org) orgCounts.set(org, (orgCounts.get(org) ?? 0) + 1);
      const webDom = getJobWebsiteDomain(job);
      if (webDom) websiteDomainCounts.set(webDom, (websiteDomainCounts.get(webDom) ?? 0) + 1);
      const emailDom = getJobEmailDomain(job);
      if (emailDom) emailDomainCounts.set(emailDom, (emailDomainCounts.get(emailDom) ?? 0) + 1);
    }

    const bestOrg = mostFrequentKey(orgCounts);
    const bestWeb = mostFrequentKey(websiteDomainCounts);
    const bestEmail = mostFrequentKey(emailDomainCounts);

    const totalJobs = recruiterJobs.length;
    let inferredName: string;
    let confidence: number;

    if (bestOrg && bestOrg.count > 0) {
      inferredName = bestOrg.value;
      confidence = Math.min(1, bestOrg.count / totalJobs);
    } else if (bestWeb && bestWeb.count > 0) {
      inferredName = bestWeb.value;
      confidence = Math.min(1, bestWeb.count / totalJobs) * 0.9;
    } else if (bestEmail && bestEmail.count > 0) {
      inferredName = bestEmail.value;
      confidence = Math.min(1, bestEmail.count / totalJobs) * 0.8;
    } else {
      inferredName = `Company (recruiter ${uid})`;
      confidence = 0.2;
    }

    let matchedNid: string | null = null;
    const inferredNorm = normalize(inferredName);
    for (const company of companies) {
      const companyWeb = getCompanyWebsiteDomain(company);
      const companyEmail = getCompanyEmailDomain(company);
      const companyTitle = getCompanyTitleNormalized(company);
      const matchByWeb = companyWeb && (companyWeb === bestWeb?.value || companyWeb === inferredNorm);
      const matchByEmail =
        companyEmail && (companyEmail === bestEmail?.value || companyEmail === inferredNorm);
      const matchByTitle = companyTitle && companyTitle === inferredNorm;
      if (matchByWeb || matchByEmail || matchByTitle) {
        matchedNid = company.nid ?? null;
        break;
      }
    }

    if (matchedNid) {
      results.push({
        recruiterUid: uid,
        strategy: 'inferred_and_enriched',
        sourceCompanyNid: matchedNid,
        inferredName: inferredName || null,
        confidence,
      });
    } else {
      results.push({
        recruiterUid: uid,
        strategy: 'inferred_from_jobs',
        sourceCompanyNid: null,
        inferredName: inferredName || null,
        confidence,
      });
    }
  }

  return results;
}

/**
 * Produce summary counts from inference results and company list.
 */
export function getInferenceSummary(
  results: CompanyInferenceResult[],
  companies: CompanyRow[]
): InferenceSummary {
  const inferredFromJobs = results.filter((r) => r.strategy === 'inferred_from_jobs').length;
  const enrichedFromDrupal = results.filter((r) => r.strategy === 'inferred_and_enriched').length;
  const placeholders = results.filter((r) => r.strategy === 'placeholder').length;
  const matchedNids = new Set(
    results
      .filter((r) => r.sourceCompanyNid != null && r.sourceCompanyNid !== '')
      .map((r) => r.sourceCompanyNid!)
  );
  const ignoredDrupalCompanies = Math.max(0, companies.length - matchedNids.size);

  return {
    inferredFromJobs,
    enrichedFromDrupal,
    placeholders,
    ignoredDrupalCompanies,
  };
}
