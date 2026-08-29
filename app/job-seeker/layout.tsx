'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { talentNetworkApi } from '@/lib/api';
import Link from 'next/link';
import TalentNetworkIntroModal from '@/app/components/talentNetwork/TalentNetworkIntroModal';
import { getTalentNetworkIntroSessionKey } from '@/lib/talentNetwork/introCampaign';

interface JobSeekerLayoutProps {
  children: ReactNode;
}

export default function JobSeekerLayout({ children }: JobSeekerLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const [cvCount, setCvCount] = useState<number | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [talentNetworkCanEdit, setTalentNetworkCanEdit] = useState(false);
  const [introCampaignId, setIntroCampaignId] = useState<string | null>(null);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [dismissingIntro, setDismissingIntro] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/profile/mine/count', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && typeof data.count === 'number') {
          setCvCount(data.count);
        }
      } catch {
        setCvCount(null);
      }
    };
    fetchCount();
  }, []);

  useEffect(() => {
    if (user?.role !== 'job-seeker') {
      setTalentNetworkCanEdit(false);
      setIntroCampaignId(null);
      setShowIntroModal(false);
      return;
    }

    talentNetworkApi
      .getAccess()
      .then((access) => {
        const canEdit = access.canEdit === true;
        setTalentNetworkCanEdit(canEdit);

        const intro = access.intro;
        if (!intro?.show || !intro.campaignId) {
          setIntroCampaignId(null);
          setShowIntroModal(false);
          return;
        }

        const sessionKey = getTalentNetworkIntroSessionKey(intro.campaignId);
        if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === '1') {
          setIntroCampaignId(intro.campaignId);
          setShowIntroModal(false);
          return;
        }

        setIntroCampaignId(intro.campaignId);
        setShowIntroModal(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, '1');
        }
      })
      .catch(() => {
        setTalentNetworkCanEdit(false);
        setIntroCampaignId(null);
        setShowIntroModal(false);
      });
  }, [user]);

  const createProfileHref = talentNetworkCanEdit
    ? '/job-seeker/profile/talent-network/new'
    : '/job-seeker/profile/new';

  const editProfileHref =
    cvCount != null && cvCount > 0
      ? '/job-seeker/profile/talent-network/edit'
      : '/job-seeker/profile/talent-network/new';

  const closeIntroForSession = () => {
    setShowIntroModal(false);
  };

  const dismissIntroPermanently = async () => {
    if (!introCampaignId || dismissingIntro) return;
    setDismissingIntro(true);
    try {
      await talentNetworkApi.dismissIntro(introCampaignId);
      setShowIntroModal(false);
    } catch {
      // Non-blocking: close locally even if the API call fails
      setShowIntroModal(false);
    } finally {
      setDismissingIntro(false);
    }
  };

  const showBanner =
    !authLoading &&
    user?.role === 'job-seeker' &&
    cvCount === 0 &&
    !bannerDismissed &&
    !showIntroModal;

  return (
    <>
      {showBanner && (
        <div className="rounded-lg bg-blue-50 border-l-4 border-blue-500 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-blue-900 flex-1">
            Create your profile so recruiters can reach out to you with job offers.
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={createProfileHref}
              className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create Profile
            </Link>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <TalentNetworkIntroModal
        open={showIntroModal}
        editProfileHref={editProfileHref}
        dismissing={dismissingIntro}
        onCloseSession={closeIntroForSession}
        onDismissPermanent={dismissIntroPermanently}
      />
      {children}
    </>
  );
}
