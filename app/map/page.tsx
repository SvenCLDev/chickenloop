'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '../components/Navbar';

const WorldMapClient = dynamic(() => import('./WorldMapClient'), { ssr: false });

interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  href: string;
  title: string;
  subtitle?: string;
}

export default function MapPage() {
  const [mode, setMode] = useState<'jobs' | 'companies'>('jobs');
  const [jobs, setJobs] = useState<MapPoint[]>([]);
  const [companies, setCompanies] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/map')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load map data');
        return res.json();
      })
      .then((data) => {
        setJobs(data.jobs || []);
        setCompanies(data.companies || []);
      })
      .catch((err) => setError(err.message || 'Failed to load map data'))
      .finally(() => setLoading(false));
  }, []);

  const points = useMemo(() => (mode === 'jobs' ? jobs : companies), [mode, jobs, companies]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="bg-amber-100 border-b border-amber-300 px-4 py-2.5 text-center text-sm text-amber-900">
        <span className="inline-block mr-1.5" aria-hidden>🚧</span>
        This map is work in progress; I am waiting for location data updates from recruiters and companies.
      </div>
      <main className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Watersports World Map</h1>
            <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-100">
              <button
                type="button"
                onClick={() => setMode('jobs')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'jobs'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Jobs
              </button>
              <button
                type="button"
                onClick={() => setMode('companies')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'companies'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Companies
              </button>
            </div>
            <span className="text-sm text-gray-500">
              {mode === 'jobs' ? `${jobs.length} jobs` : `${companies.length} companies`}
            </span>
          </div>
        </div>

        <div className="flex-1 relative min-h-[calc(100vh-140px)]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
              <p className="text-gray-600">Loading map data...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          {!loading && !error && (
            <div className="absolute inset-0 z-0">
              <WorldMapClient points={points} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
