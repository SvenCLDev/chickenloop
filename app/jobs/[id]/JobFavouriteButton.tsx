'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { jobsApi } from '@/lib/api';

interface JobFavouriteButtonProps {
  jobId: string;
}

export default function JobFavouriteButton({ jobId }: JobFavouriteButtonProps) {
  const { user } = useAuth();
  const [isFavourite, setIsFavourite] = useState(false);
  const [togglingFavourite, setTogglingFavourite] = useState(false);
  const [checkingFavourite, setCheckingFavourite] = useState(false);

  useEffect(() => {
    if (user && user.role === 'job-seeker' && jobId) {
      checkFavouriteStatus();
    }
  }, [user, jobId]);

  const checkFavouriteStatus = async () => {
    if (!user || user.role !== 'job-seeker') return;
    
    setCheckingFavourite(true);
    try {
      const data = await jobsApi.checkFavourite(jobId);
      setIsFavourite(data.isFavourite);
    } catch (err: any) {
      // Silently fail - not critical
    } finally {
      setCheckingFavourite(false);
    }
  };

  const handleToggleFavourite = async () => {
    if (!user || user.role !== 'job-seeker' || togglingFavourite) return;
    
    setTogglingFavourite(true);
    try {
      const data = await jobsApi.toggleFavourite(jobId);
      setIsFavourite(data.isFavourite);
    } catch (err: any) {
      alert(err.message || 'Failed to update favourites. Please try again.');
    } finally {
      setTogglingFavourite(false);
    }
  };

  if (!user || user.role !== 'job-seeker') {
    return null;
  }

  return (
    <button
      onClick={handleToggleFavourite}
      disabled={togglingFavourite || checkingFavourite}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
    >
      {togglingFavourite ? (
        <span>...</span>
      ) : isFavourite ? (
        <>
          <svg className="w-4 h-4 fill-yellow-500" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>In Favourites</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>Add to Favourites</span>
        </>
      )}
    </button>
  );
}

