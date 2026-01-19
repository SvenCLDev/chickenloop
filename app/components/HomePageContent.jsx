'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { jobsApi } from '@/lib/api';
import { JOB_CATEGORIES } from '@/src/constants/jobCategories';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import JobCard from './JobCard';
import CompanyCard from './CompanyCard';
import CandidateCard from './CandidateCard';
import SectionHeader from './SectionHeader';
import SearchBar from './SearchBar';
import CompaniesPreview from './CompaniesPreview';
import MapPreview from './MapPreview';

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
  const [topCandidates, setTopCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  
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
      // Get the 3 most recent jobs (already sorted by updatedAt -1 from API)
      setLatestJobs(jobsList.slice(0, 3));
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
      
      // Add job count to each company and get first 4
      const companiesWithJobCount = companies.slice(0, 4).map((company) => ({
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


  // Get job categories from canonical source (JOB_CATEGORIES)
  // Filter to only show categories that exist in the loaded jobs
  const getAvailableCategories = () => {
    const availableCategories = new Set();
    
    allJobs.forEach((job) => {
      if (job.occupationalAreas && job.occupationalAreas.length > 0) {
        job.occupationalAreas.forEach((category) => {
          // Only include categories that are in JOB_CATEGORIES (skip old/invalid values)
          if (JOB_CATEGORIES.includes(category)) {
            availableCategories.add(category);
          }
        });
      }
    });

    // Convert to array, filter to JOB_CATEGORIES, and sort alphabetically
    return JOB_CATEGORIES.filter(cat => availableCategories.has(cat));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation - Same as all other pages */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative min-h-[500px] flex items-center justify-center overflow-hidden">
          {/* Background Images Container */}
          <div className="absolute inset-0">
            {HERO_IMAGES.map((imageSrc, index) => (
              <div
                key={imageSrc}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={imageSrc}
                  alt={`Hero background ${index + 1}`}
                  fill
                  priority={index === 0}
                  className="object-cover"
                  quality={90}
                />
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
                  {featuredJobs.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        
        {/* Featured Companies Section */}
        <section className="bg-white pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader title="Featured Companies" />
            
            {companiesLoading ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg">Loading companies...</p>
              </div>
            ) : featuredCompanies.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg">No companies available at the moment.</p>
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
        
        {/* Latest Jobs Section */}
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
            ) : latestJobs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-600 text-lg">No jobs available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {latestJobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>
            )}
          </div>
        </section>
        
        {/* Companies Preview Section */}
        <CompaniesPreview />
        
        {/* Map Preview Section */}
        <MapPreview />
        
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
      </main>
    </div>
  );
}
