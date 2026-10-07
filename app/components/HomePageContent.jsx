'use client';

import { useState, useEffect, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { jobsApi, careerAdviceApi } from '@/lib/api';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import { useAuth } from '../contexts/AuthContext';
import JobCard from './JobCard';
import CompanyCard from './CompanyCard';
import CandidateCard from './CandidateCard';
import CareerAdviceCard from './CareerAdviceCard';
import SectionHeader from './SectionHeader';
import SearchBar from './SearchBar';
import CompaniesPreview from './CompaniesPreview';
import HomepageValueProps from './HomepageValueProps';
import TurnstileWidget from './TurnstileWidget';
import { deferUntilIdle } from '@/lib/deferUntilIdle';

/**
 * @param {Object} props
 * @param {import('@/lib/homepageJobs').HomepageJobCard[]} [props.initialLatestJobs]
 * @param {import('@/lib/homepageJobs').HomepageJobCard[]} [props.initialFeaturedJobs]
 * @param {string[]} [props.initialCategoryValues]
 */
export default function HomePageContent({
  initialLatestJobs = [],
  initialFeaturedJobs = [],
  initialCategoryValues = [],
}) {
  const { user } = useAuth();
  const t = useTranslations('Home');
  const tAbout = useTranslations('About');
  const tContact = useTranslations('Contact');
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [categoryValues, setCategoryValues] = useState(initialCategoryValues);
  const [categoriesLoading, setCategoriesLoading] = useState(initialCategoryValues.length === 0);
  const [latestJobs, setLatestJobs] = useState(initialLatestJobs);
  const [latestJobsLoading, setLatestJobsLoading] = useState(initialLatestJobs.length === 0);
  const [featuredJobs, setFeaturedJobs] = useState(initialFeaturedJobs);
  const [featuredJobsLoading, setFeaturedJobsLoading] = useState(initialFeaturedJobs.length === 0);
  const [featuredCompanies, setFeaturedCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [careerAdviceArticles, setCareerAdviceArticles] = useState([]);
  const [careerAdviceLoading, setCareerAdviceLoading] = useState(true);
  const [topCandidates, setTopCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactStatus, setContactStatus] = useState(null);
  const [contactTurnstileToken, setContactTurnstileToken] = useState(null);
  const [contactTurnstileResetKey, setContactTurnstileResetKey] = useState(0);
  
  // Favourite hearts (job-seeker only)
  const [favouriteJobIds, setFavouriteJobIds] = useState(new Set());
  const [togglingFavouriteId, setTogglingFavouriteId] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (categoryValues.length === 0) {
      loadCategories();
    }
    if (initialFeaturedJobs.length === 0) {
      loadFeaturedJobs();
    }
    // Load top candidates (only if user is recruiter or admin)
    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      loadTopCandidates();
    }
    if (user?.role === 'job-seeker') {
      jobsApi.getFavourites().then((data) => {
        const ids = new Set((data.jobs || []).map((j) => String(j._id)));
        setFavouriteJobIds(ids);
      }).catch(() => {});
    } else {
      setFavouriteJobIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    return deferUntilIdle(() => {
      loadCareerAdvice();
    }, 5000);
  }, []);

  useEffect(() => {
    return deferUntilIdle(() => {
      loadFeaturedCompanies();
    }, 5000);
  }, []);

  const handleToggleFavourite = async (e, jobId) => {
    e.preventDefault();
    e.stopPropagation();
    if (togglingFavouriteId || user?.role !== 'job-seeker') return;
    setTogglingFavouriteId(jobId);
    try {
      await jobsApi.toggleFavourite(jobId);
      setFavouriteJobIds((prev) => {
        const next = new Set(prev);
        if (next.has(jobId)) next.delete(jobId);
        else next.add(jobId);
        return next;
      });
    } catch {
      // keep state unchanged on error
    } finally {
      setTogglingFavouriteId(null);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/job-categories');
      if (!response.ok) {
        throw new Error('Failed to fetch job categories');
      }
      const data = await response.json();
      setCategoryValues(data.categories || []);
    } catch (err) {
      console.error('Failed to load job categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadFeaturedJobs = async () => {
    try {
      const response = await fetch('/api/jobs?featured=true');
      const data = await response.json();
      const jobsList = data.jobs || [];
      // Get the first 6 featured jobs
      setFeaturedJobs(jobsList.slice(0, 6));
    } catch (err) {
      console.error('Failed to load featured jobs:', err);
    } finally {
      setFeaturedJobsLoading(false);
    }
  };

  const loadFeaturedCompanies = async () => {
    try {
      // Fetch featured companies and jobs in parallel
      const [companiesResponse, jobsResponse] = await Promise.all([
        fetch('/api/companies-list?featured=true'),
        fetch('/api/jobs-list')
      ]);
      
      const companiesData = await companiesResponse.json();
      const jobsData = await jobsResponse.json();
      
      const companies = companiesData.companies || [];
      const jobs = jobsData.jobs || [];
      
      // Count active (published) jobs per company
      // Match by companyId or by company name as fallback
      const jobCountsByCompany = {};
      const companyIdMap = {}; // Map company name to company ID
      
      companies.forEach((company) => {
        companyIdMap[company.name] = company.id;
      });
      
      jobs.forEach((job) => {
        if (job.published !== false) {
          let companyId = null;
          
          // Try to get companyId from job object
          if (job.companyId) {
            companyId = job.companyId._id || job.companyId.id || job.companyId;
          }
          
          // Fallback: match by company name
          if (!companyId && job.company && companyIdMap[job.company]) {
            companyId = companyIdMap[job.company];
          }
          
          if (companyId) {
            jobCountsByCompany[companyId] = (jobCountsByCompany[companyId] || 0) + 1;
          }
        }
      });
      
      // Sort: companies with picture (or logo) first, then without; then take first 8
      const hasPicture = (c) => (c.pictures && c.pictures.length > 0) || (c.logo && c.logo.trim());
      const sorted = [...companies].sort((a, b) => {
        const aHas = hasPicture(a);
        const bHas = hasPicture(b);
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return 0;
      });
      const companiesWithJobCount = sorted.slice(0, 8).map((company) => ({
        ...company,
        jobCount: jobCountsByCompany[company.id] || 0
      }));
      
      setFeaturedCompanies(companiesWithJobCount);
    } catch (err) {
      console.error('Failed to load featured companies:', err);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const loadCareerAdvice = async () => {
    try {
      const data = await careerAdviceApi.getAll(); // Only published articles
      const articles = data.articles || [];
      // Get the latest 4 articles (already sorted by newest first from API)
      setCareerAdviceArticles(articles.slice(0, 4));
    } catch (err) {
      console.error('Failed to load career advice articles:', err);
    } finally {
      setCareerAdviceLoading(false);
    }
  };

  const loadTopCandidates = async () => {
    try {
      const response = await fetch('/api/candidates-list');
      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }
      const data = await response.json();
      const candidates = data.cvs || [];
      // Get the first 4 candidates (already sorted by newest first from API)
      setTopCandidates(candidates.slice(0, 4));
    } catch (err) {
      console.error('Failed to load top candidates:', err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus(null);
    setContactSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          message: contactMessage.trim(),
          turnstileToken: contactTurnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setContactStatus({ type: 'success', text: data.message || tContact('success') });
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      } else {
        setContactStatus({
          type: 'error',
          text: data.error || tContact('error'),
        });
      }
    } catch {
      setContactStatus({
        type: 'error',
        text: tContact('error'),
      });
    } finally {
      setContactSubmitting(false);
    }
  };


  // Map distinct category values to SearchBar options (value→label)
  const getAvailableCategories = () => {
    const availableValues = new Set(categoryValues);
    return JOB_CATEGORIES.filter((cat) => availableValues.has(cat.value));
  };

  // Latest jobs excluding those already shown in Featured Jobs – take first 6 for display
  const latestExcludingFeatured = useMemo(() => {
    const featuredIds = new Set(featuredJobs.map((f) => f._id));
    return latestJobs.filter((job) => !featuredIds.has(job._id)).slice(0, 6);
  }, [latestJobs, featuredJobs]);

  return (
    <>
        {/* Search Bar Section */}
        <SearchBar
          keyword={keyword}
          location={location}
          category={category}
          categories={getAvailableCategories()}
          categoriesLoading={categoriesLoading}
          onKeywordChange={setKeyword}
          onLocationChange={setLocation}
          onCategoryChange={setCategory}
        />
        
        <HomepageValueProps />
        
        {/* Featured Jobs Section */}
        {!featuredJobsLoading && featuredJobs.length > 0 && (
          <section className="bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader title={t("featuredJobs")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {featuredJobs.map((job) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    priority={false}
                    featured
                    user={user}
                    isFavourite={favouriteJobIds.has(job._id)}
                    togglingFavourite={togglingFavouriteId === job._id}
                    onHeartClick={handleToggleFavourite}
                    onLoginPrompt={() => setShowLoginPrompt(true)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* Featured Companies Section */}
        {!companiesLoading && featuredCompanies.length > 0 && (
          <section className="bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader title={t("featuredCompanies")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {featuredCompanies.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            </div>
          </section>
        )}
        
        {/* Latest Jobs Section - exclude jobs already shown in Featured Jobs */}
        <section className="bg-gray-50 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title={t("latestJobs")}
              actionLabel="View All Jobs"
              actionHref="/jobs-list"
            />
            {latestJobsLoading ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg">Loading jobs...</p>
              </div>
            ) : latestExcludingFeatured.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg">No jobs available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {latestExcludingFeatured.map((job, index) => (
                  <JobCard
                    key={job._id}
                    job={job}
                    priority={false}
                    user={user}
                    isFavourite={favouriteJobIds.has(job._id)}
                    togglingFavourite={togglingFavouriteId === job._id}
                    onHeartClick={handleToggleFavourite}
                    onLoginPrompt={() => setShowLoginPrompt(true)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
        
        {/* Career Advice Section */}
        {careerAdviceArticles.length > 0 && (
          <section className="bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                title={t("careerAdvice")}
                actionLabel="View All Articles"
                actionHref="/career-advice"
              />
              
              {careerAdviceLoading ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">Loading articles...</p>
                </div>
              ) : careerAdviceArticles.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">No articles available at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
                  {careerAdviceArticles.map((article) => (
                    <CareerAdviceCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        
        {/* Companies Preview Section */}
        <CompaniesPreview />
        
        {/* World Watersports Map Section */}
        <section className="bg-gray-50 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title={t("worldMap")}
              actionLabel="View Map"
              actionHref="/map"
            />
            <Link
              href="/map"
              className="block rounded-xl overflow-hidden shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
            >
              <div className="aspect-[2/1] w-full relative">
                <Image
                  src="/watersports-map.jpg"
                  alt="World Watersports Map"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/5 transition-colors">
                  <span className="text-blue-600 font-semibold text-lg px-4 py-2 bg-white/90 rounded-lg shadow-md">
                    Explore jobs and companies worldwide →
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>
        
        {/* Featured Talent Section - Only visible to recruiters and admins */}
        {user && (user.role === 'recruiter' || user.role === 'admin') && (
          <section className="bg-gray-50 pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader title={t("featuredTalent")} />
              <p className="text-gray-600 text-base sm:text-lg -mt-4 mb-8 sm:mb-10 max-w-2xl">
                Verified profiles from the Chickenloop Talent Network
              </p>
              
              {candidatesLoading ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">Loading talent...</p>
                </div>
              ) : topCandidates.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">No talent profiles available at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {topCandidates.map((candidate) => (
                    <CandidateCard key={candidate._id} candidate={candidate} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* About Section - The Chickenloop Story */}
        <section id="about" className="bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">{tAbout('title')}</h2>
            <div className="prose max-w-none text-gray-700 leading-relaxed space-y-6 text-sm">
              <p>{tAbout('p1')}</p>
              <p>{tAbout('p2')}</p>
              <p>{tAbout('p3')}</p>
              <p>{tAbout('p4')}</p>
              <p>{tAbout('p5')}</p>
              <p>{tAbout('p6')}</p>
              <p>{tAbout('p7')}</p>
              <p className="font-medium">
                {tAbout('signOff')}
                <br />
                {tAbout('signName')}
              </p>
            </div>
            <div className="mt-10 flex justify-center">
              <Image
                src="https://cy1wkdwruflm9kfu.public.blob.vercel-storage.com/about/sven-rooster.png"
                alt={tAbout('imageAlt')}
                width={300}
                height={300}
                className="rounded-lg object-cover shadow-md"
              />
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="bg-gray-50 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">{tContact('title')}</h2>
            <div className="prose max-w-none text-gray-700 leading-relaxed space-y-6 mb-10 text-sm">
              <p>{tContact('p1')}</p>
              <p>{tContact('p2')}</p>
              <p>{tContact('p3')}</p>
              <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">{tContact('whereTitle')}</h3>
              <p>{tContact('whereIntro')}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{tContact('location1')}</li>
                <li>{tContact('location2')}</li>
              </ul>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{tContact('formTitle')}</h3>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label htmlFor="home-contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                  {tContact('nameLabel')}
                </label>
                <input
                  id="home-contact-name"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                  placeholder={tContact('namePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="home-contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                  {tContact('emailLabel')}
                </label>
                <input
                  id="home-contact-email"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                  placeholder={tContact('emailPlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="home-contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                  {tContact('messageLabel')}
                </label>
                <textarea
                  id="home-contact-message"
                  required
                  rows={5}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-gray-700"
                  placeholder={tContact('messagePlaceholder')}
                />
              </div>
              <TurnstileWidget
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                onVerify={setContactTurnstileToken}
                resetKey={contactTurnstileResetKey}
              />
              {contactStatus && (
                <p className={contactStatus.type === 'success' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {contactStatus.text}
                </p>
              )}
              <button
                type="submit"
                disabled={contactSubmitting || !contactTurnstileToken}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {contactSubmitting ? tContact('submitting') : tContact('submit')}
              </button>
            </form>
          </div>
        </section>

      {/* Login prompt toast when anonymous user clicks heart */}
      {showLoginPrompt && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md mx-4 px-4 py-3 rounded-lg bg-gray-900 text-white text-sm shadow-xl flex flex-col gap-2"
          role="alert"
        >
          <p className="text-center">
            Login or register as a jobseeker to mark jobs as favourites, create job alerts, list your profile and more.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-md bg-white text-gray-900 font-medium hover:bg-gray-100"
              onClick={() => setShowLoginPrompt(false)}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600"
              onClick={() => setShowLoginPrompt(false)}
            >
              Register
            </Link>
            <button
              type="button"
              onClick={() => setShowLoginPrompt(false)}
              className="px-2 py-1 text-gray-400 hover:text-white"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
