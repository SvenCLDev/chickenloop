'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { jobsApi, careerAdviceApi } from '@/lib/api';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import JobCard from './JobCard';
import CompanyCard from './CompanyCard';
import CandidateCard from './CandidateCard';
import CareerAdviceCard from './CareerAdviceCard';
import SectionHeader from './SectionHeader';
import SearchBar from './SearchBar';
import CompaniesPreview from './CompaniesPreview';

// Hero background images - add more images to this array to rotate through them
const HERO_IMAGES = [
  '/Kitesurfer.jpg',
  '/Sailing.jpg',
  '/Wingfoil.jpg',
  '/Diving.jpg',
];

export default function HomePageContent() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [allJobs, setAllJobs] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [latestJobs, setLatestJobs] = useState([]);
  const [latestJobsLoading, setLatestJobsLoading] = useState(true);
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [featuredJobsLoading, setFeaturedJobsLoading] = useState(true);
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
  
  // Hero image rotation state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Load jobs to extract unique categories
    loadJobs();
    // Load latest jobs for display
    loadLatestJobs();
    // Load featured jobs for display
    loadFeaturedJobs();
    // Load featured companies
    loadFeaturedCompanies();
    // Load career advice articles
    loadCareerAdvice();
    // Load top candidates (only if user is recruiter or admin)
    if (user && (user.role === 'recruiter' || user.role === 'admin')) {
      loadTopCandidates();
    }
  }, [user]);

  // Rotate hero background images
  useEffect(() => {
    // Only rotate if there are multiple images
    if (HERO_IMAGES.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % HERO_IMAGES.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const data = await jobsApi.getAll();
      const jobsList = data.jobs || [];
      setAllJobs(jobsList);
    } catch (err) {
      // Silently fail - categories will just be empty
      console.error('Failed to load jobs for categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadLatestJobs = async () => {
    try {
      const response = await fetch('/api/jobs-list');
      const data = await response.json();
      const jobsList = data.jobs || [];
      // Fetch enough so that after excluding featured we can show 3 (e.g. up to 3 featured + 3 latest = 6)
      setLatestJobs(jobsList.slice(0, 9));
    } catch (err) {
      console.error('Failed to load latest jobs:', err);
    } finally {
      setLatestJobsLoading(false);
    }
  };

  const loadFeaturedJobs = async () => {
    try {
      const response = await fetch('/api/jobs?featured=true');
      const data = await response.json();
      const jobsList = data.jobs || [];
      // Get the first 3 featured jobs
      setFeaturedJobs(jobsList.slice(0, 3));
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
      
      // Add job count to each company and get first 8
      const companiesWithJobCount = companies.slice(0, 8).map((company) => ({
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setContactStatus({ type: 'success', text: data.message || 'Thanks! Your message has been sent.' });
        setContactName('');
        setContactEmail('');
        setContactMessage('');
      } else {
        setContactStatus({
          type: 'error',
          text: data.error || 'Something went wrong. Please try again or email hello@chickenloop.com.',
        });
      }
    } catch {
      setContactStatus({
        type: 'error',
        text: 'Something went wrong. Please try again or email hello@chickenloop.com.',
      });
    } finally {
      setContactSubmitting(false);
    }
  };


  // Get job categories from jobs - values only. UI maps value→label for display.
  const getAvailableCategories = () => {
    const availableValues = new Set();
    allJobs.forEach((job) => {
      if (job.occupationalAreas && job.occupationalAreas.length > 0) {
        job.occupationalAreas.forEach((value) => {
          if (JOB_CATEGORIES.some((c) => c.value === value)) {
            availableValues.add(value);
          }
        });
      }
    });
    return JOB_CATEGORIES.filter((cat) => availableValues.has(cat.value));
  };

  // Latest jobs excluding those already shown in Featured Jobs – take first 6 for display
  const latestExcludingFeatured = useMemo(() => {
    const featuredIds = new Set(featuredJobs.map((f) => f._id));
    return latestJobs.filter((job) => !featuredIds.has(job._id)).slice(0, 6);
  }, [latestJobs, featuredJobs]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation - Same as all other pages */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow">
        {/* Hero Section - fixed height to prevent CLS */}
        <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
          {/* Background Images Container - relative for fill images */}
          <div className="absolute inset-0">
            {HERO_IMAGES.map((imageSrc, index) => (
              <div
                key={imageSrc}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {index === 0 ? (
                  <Image
                    src={imageSrc}
                    alt={`Hero background ${index + 1}`}
                    fill
                    priority
                    fetchPriority="high"
                    quality={60}
                    sizes="100vw"
                    className="object-cover"
                  />
                ) : (
                  <Image
                    src={imageSrc}
                    alt={`Hero background ${index + 1}`}
                    fill
                    loading="lazy"
                    quality={60}
                    sizes="100vw"
                    className="object-cover"
                  />
                )}
              </div>
            ))}
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-cyan-900/60 to-teal-900/70"></div>
          </div>
          
          {/* Hero Content */}
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg">
              Find Your Next Watersports Job
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-6 sm:mb-8 drop-shadow-md max-w-2xl mx-auto">
              Kite, surf, foil, sail or dive — discover opportunities worldwide.
            </p>
            <Link
              href="/jobs"
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Browse Jobs
            </Link>
          </div>
        </section>
        
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
        
        {/* Featured Jobs Section */}
        {featuredJobs.length > 0 && (
          <section className="bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                title="Featured Jobs"
              />
              
              {featuredJobsLoading ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">Loading featured jobs...</p>
                </div>
              ) : featuredJobs.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">No featured jobs at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {featuredJobs.map((job, index) => (
                    <JobCard key={job._id} job={job} priority={index === 0} featured />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        
        {/* Featured Companies Section - hidden when there are no featured companies */}
        {(!companiesLoading && featuredCompanies.length === 0) ? null : (
          <section className="bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader title="Featured Companies" />
              
              {companiesLoading ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">Loading companies...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {featuredCompanies.map((company) => (
                    <CompanyCard key={company.id} company={company} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        
        {/* Latest Jobs Section - exclude jobs already shown in Featured Jobs */}
        <section className="bg-gray-50 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="Latest Jobs"
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
                  <JobCard key={job._id} job={job} priority={featuredJobs.length === 0 && index === 0} />
                ))}
              </div>
            )}
          </div>
        </section>
        
        {/* Companies Preview Section */}
        <CompaniesPreview />
        
        {/* Career Advice Section */}
        {careerAdviceArticles.length > 0 && (
          <section className="bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader
                title="Career Advice"
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
        
        {/* Top Candidates Section - Only visible to recruiters and admins */}
        {user && (user.role === 'recruiter' || user.role === 'admin') && (
          <section className="bg-gray-50 pt-6 pb-12 sm:pt-8 sm:pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SectionHeader title="Top Candidates" />
              
              {candidatesLoading ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">Loading candidates...</p>
                </div>
              ) : topCandidates.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-lg">No candidates available at the moment.</p>
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">The Chickenloop Story</h2>
            <div className="prose max-w-none text-gray-700 leading-relaxed space-y-6 text-sm">
              <p>
                Back in 2013, I was deep in the grind of launching a watersports center in India. Between the logistics and the lessons, I hit a major snag: hiring. Finding qualified, reliable instructors felt like trying to kite in a dead calm—expensive, exhausting, and going nowhere.
              </p>
              <p>
                I knew there had to be a better way to link centers with the talent they need. So, I grabbed a coffee, opened a code editor, and Chickenloop was born.
              </p>
              <p>
                We started with kitesurfing, but the community had other plans. As more centers reached out, we expanded to cover the whole horizon—sailing, surfing, diving, SUP, and beyond.
              </p>
              <p>
                Fast forward to 2024. The original site was a bit &quot;weathered,&quot; and it was time for a total refit. I&apos;ve spent my recent downtime rebuilding Chickenloop from scratch. The new platform is built on modern tech, designed to be the fastest way to get your crew on the boat or your instructors on the beach.
              </p>
              <p>
                This project is for the community. That&apos;s why basic job posts and resumes are free, supported by a few optional premium features to keep us running.
              </p>
              <p>
                Whether you&apos;re looking for your next season in the sun or the perfect addition to your team, I hope Chickenloop helps you find your line.
              </p>
              <p className="font-medium">
                See you on the water,<br />
                Sven
              </p>
            </div>
            <div className="mt-10 flex justify-center">
              <Image
                src="https://cy1wkdwruflm9kfu.public.blob.vercel-storage.com/about/sven-rooster.png"
                alt="Sven"
                width={300}
                height={300}
                className="rounded-lg object-cover shadow-md"
              />
            </div>
          </div>
        </section>

        {/* Contact Section - Signal the Shore */}
        <section id="contact" className="bg-gray-50 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Signal the Shore 🚩</h2>
            <div className="prose max-w-none text-gray-700 leading-relaxed space-y-6 mb-10 text-sm">
              <p>
                Whether you&apos;ve got a suggestion for the new website, a bug to report, or just want to touch base, I&apos;m always listening.
              </p>
              <p>
                Chickenloop is a community-driven project, and your feedback is the &quot;wind&quot; that helps me figure out which direction to steer the platform next.
              </p>
              <p>
                Keep me in the (chicken) loop and drop me a line.
              </p>
              <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">Where to Find Me</h3>
              <p>
                Chickenloop is a passion project of Sven Kelling (Chesterton Consulting). When I am not managing the code, you&apos;ll usually find me between these two spots:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Miramar Beach, Goa, India 🇮🇳</li>
                <li>Playa de Can Pastilla, Mallorca, Spain 🇪🇸</li>
              </ul>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Drop a Message</h3>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label htmlFor="home-contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  id="home-contact-name"
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="home-contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Email
                </label>
                <input
                  id="home-contact-email"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="home-contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                  What&apos;s on your mind? (Suggestions, feedback, or just a hello)
                </label>
                <textarea
                  id="home-contact-message"
                  required
                  rows={5}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-gray-700"
                  placeholder="Your message..."
                />
              </div>
              {contactStatus && (
                <p className={contactStatus.type === 'success' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {contactStatus.text}
                </p>
              )}
              <button
                type="submit"
                disabled={contactSubmitting}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {contactSubmitting ? 'Sending...' : 'Send Message 🤙'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
