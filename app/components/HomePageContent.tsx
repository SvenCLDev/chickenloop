'use client';

import React, { useState, useEffect } from 'react';

interface FeaturedCandidate {
  _id: string;
  name: string;
  jobTitle: string;
  country?: string;
  city?: string;
}

export default function HomePageContent() {
  const [featuredCandidates, setFeaturedCandidates] = useState<FeaturedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeaturedCandidates() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/candidates-list?featured=true');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch featured candidates');
        }

        setFeaturedCandidates(data.cvs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    loadFeaturedCandidates();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p className="text-gray-600">Loading featured candidates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8">Welcome to Chickenloop!</h1>
      <p className="text-lg text-center text-gray-700 mb-12">
        Find your next watersports job or the perfect candidate.
      </p>

      {featuredCandidates.length > 0 ? (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Featured Candidates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCandidates.map(candidate => (
              <div key={candidate._id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-blue-600">{candidate.name}</h3>
                <p className="text-gray-700">{candidate.jobTitle}</p>
                {(candidate.city || candidate.country) && (
                  <p className="text-sm text-gray-500">
                    {candidate.city && <span>{candidate.city}</span>}
                    {candidate.city && candidate.country && <span>, </span>}
                    {candidate.country && <span>{candidate.country}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-center text-gray-600">No featured candidates available at the moment.</p>
      )}

      <section className="mt-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">Your next adventure starts here!</h2>
        <a href="/jobs" className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-700 transition-colors">
          Browse Jobs
        </a>
      </section>
    </div>
  );
}
