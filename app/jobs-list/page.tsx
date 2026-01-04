import { redirect } from 'next/navigation';

/**
 * Redirect /jobs-list to /jobs to avoid duplicate routes and ensure SEO-friendly URLs
 */
export default function JobsListRedirect() {
  redirect('/jobs');
}
