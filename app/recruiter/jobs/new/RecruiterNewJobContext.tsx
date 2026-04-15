'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { apiRequest, jobsApi, companyApi } from '@/lib/api';
import { compressIncomingJobPhotoFiles } from '@/lib/compressJobImage';
import {
  assertJobJsonPayloadFits,
  JOB_PHOTO_UPLOAD_TOO_LARGE_MESSAGE,
  looksLikePayloadTooLargeError,
  sanitizeJobDescriptionForSubmit,
  validateJobPhotoFilesForUpload,
} from '@/lib/jobPostPayload';
import { sanitizeFileForUpload } from '@/lib/sanitizeFilenameForUpload';
import { stripHtmlToText } from '@/lib/sanitizeText';
import { OFFICIAL_LANGUAGES } from '@/lib/languages';
import {
  getCountryNameFromCode,
  normalizeCountryForStorage,
} from '@/lib/countryUtils';

const STEP1_OK_KEY = 'recruiterNewJobStep1Ok';

export type RecruiterNewJobFormData = {
  title: string;
  description: string;
  city: string;
  country: string;
  salary: string;
  type: string;
  experienceLevel: string[];
  languages: string[];
  qualifications: string[];
  sports: string[];
  occupationalAreas: string[];
  applyViaATS: boolean;
  applyByEmail: boolean;
  applyByWebsite: boolean;
  applyByWhatsApp: boolean;
  applicationEmail: string;
  applicationWebsite: string;
  applicationWhatsApp: string;
};

const initialFormData: RecruiterNewJobFormData = {
  title: '',
  description: '',
  city: '',
  country: '',
  salary: '',
  type: 'full-time',
  experienceLevel: [],
  languages: [],
  qualifications: [],
  sports: [],
  occupationalAreas: [],
  applyViaATS: true,
  applyByEmail: true,
  applyByWebsite: false,
  applyByWhatsApp: false,
  applicationEmail: '',
  applicationWebsite: '',
  applicationWhatsApp: '',
};

type RecruiterNewJobContextValue = {
  user: ReturnType<typeof useAuth>['user'];
  authLoading: boolean;
  company: any;
  companyLoading: boolean;
  formData: RecruiterNewJobFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecruiterNewJobFormData>>;
  previewCountryCode: string | undefined;
  selectedPictures: File[];
  picturePreviews: string[];
  heroImageIndex: number | null;
  setHeroImageIndex: React.Dispatch<React.SetStateAction<number | null>>;
  uploadingPictures: boolean;
  optimizingPictures: boolean;
  optimizingMessage: string;
  parsingDescription: boolean;
  saveAsDraft: boolean;
  setSaveAsDraft: (v: boolean) => void;
  error: string;
  setError: (s: string) => void;
  loading: boolean;
  showSuccessModal: boolean;
  handlePictureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePicture: (index: number) => void;
  handleNext: () => Promise<void>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
};

const RecruiterNewJobContext = createContext<RecruiterNewJobContextValue | null>(
  null
);

export function useRecruiterNewJob() {
  const ctx = useContext(RecruiterNewJobContext);
  if (!ctx) {
    throw new Error('useRecruiterNewJob must be used within RecruiterNewJobProvider');
  }
  return ctx;
}

function validateStep1(formData: RecruiterNewJobFormData): string[] {
  const errs: string[] = [];
  if (!formData.title?.trim()) errs.push('Job Title is required');
  const plainDesc = stripHtmlToText(formData.description).trim();
  if (!plainDesc) errs.push('Description is required');
  return errs;
}

export function RecruiterNewJobProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [formData, setFormData] = useState<RecruiterNewJobFormData>(initialFormData);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [selectedPictures, setSelectedPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [uploadingPictures, setUploadingPictures] = useState(false);
  const [optimizingPictures, setOptimizingPictures] = useState(false);
  const [optimizingMessage, setOptimizingMessage] = useState('');
  const [parsingDescription, setParsingDescription] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState<number | null>(null);

  const previewCountryCode = normalizeCountryForStorage(formData.country);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  const loadCompany = useCallback(async () => {
    try {
      const data = await companyApi.get();
      setCompany(data.company);

      if (data.company?.address) {
        const companyCountryCode = data.company.address.country;
        const companyCountryName = companyCountryCode
          ? getCountryNameFromCode(companyCountryCode)
          : '';
        setFormData((prev) => ({
          ...prev,
          city: data.company.address.city || prev.city,
          country: companyCountryName || prev.country,
        }));
      }

      if (data.company) {
        setFormData((prev) => ({
          ...prev,
          applicationEmail:
            prev.applicationEmail ||
            user?.email ||
            data.company.email ||
            data.company.contact?.email ||
            '',
          applicationWebsite: data.company.website || prev.applicationWebsite,
        }));
      }
    } catch (err: any) {
      if (err.message?.includes?.('not found')) {
        setCompany(null);
      } else {
        setError(err.message || 'Failed to load company');
      }
    } finally {
      setCompanyLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (user?.role === 'recruiter') {
      void loadCompany();
    }
  }, [user?.role, loadCompany]);

  /** Continue route: require step 1 completion marker */
  useEffect(() => {
    if (authLoading || companyLoading) return;
    if (pathname !== '/recruiter/jobs/new/continue') return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(STEP1_OK_KEY) !== 'true') {
      router.replace('/recruiter/jobs/new');
    }
  }, [pathname, authLoading, companyLoading, router]);

  const handlePictureChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const files = Array.from(input.files || []);
      input.value = '';

      void (async () => {
        if (files.length + selectedPictures.length > 3) {
          setError('Maximum 3 pictures allowed');
          return;
        }

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        for (const file of files) {
          if (!validTypes.includes(file.type)) {
            setError(`Invalid file type: ${file.name}. Only images (JPEG, PNG, WEBP, GIF) are allowed.`);
            return;
          }
        }

        setOptimizingPictures(true);
        setOptimizingMessage('Optimizing image…');
        setError('');

        const compressed = await compressIncomingJobPhotoFiles(files, (msg) =>
          setOptimizingMessage(msg)
        );
        if (!compressed.ok) {
          setError(compressed.error);
          setOptimizingPictures(false);
          setOptimizingMessage('');
          return;
        }

        const newPictures = [...selectedPictures, ...compressed.files];
        const uploadErr = validateJobPhotoFilesForUpload(newPictures);
        if (uploadErr) {
          setError(uploadErr);
          setOptimizingPictures(false);
          setOptimizingMessage('');
          return;
        }

        setSelectedPictures(newPictures);
        const newPreviews = compressed.files.map((file) => URL.createObjectURL(file));
        setPicturePreviews((prev) => [...prev, ...newPreviews]);

        if (newPictures.length === 1 && heroImageIndex === null) {
          setHeroImageIndex(0);
        }

        setOptimizingPictures(false);
        setOptimizingMessage('');
      })();
    },
    [selectedPictures, heroImageIndex]
  );

  const removePicture = useCallback(
    (index: number) => {
      const newPictures = selectedPictures.filter((_, i) => i !== index);
      const newPreviews = picturePreviews.filter((_, i) => i !== index);
      URL.revokeObjectURL(picturePreviews[index]);
      setSelectedPictures(newPictures);
      setPicturePreviews(newPreviews);
      if (heroImageIndex === index) {
        setHeroImageIndex(newPictures.length > 0 ? 0 : null);
      } else if (heroImageIndex !== null && heroImageIndex > index) {
        setHeroImageIndex(heroImageIndex - 1);
      }
    },
    [selectedPictures, picturePreviews, heroImageIndex]
  );

  const runAutoFillMerge = useCallback(async () => {
    const plain = stripHtmlToText(formData.description).trim();
    if (!plain) return;

    const data = (await apiRequest('/ai/parse-job', {
      method: 'POST',
      body: JSON.stringify({ description: plain }),
    })) as {
      employmentType?: string | null;
      language?: string | null;
      experienceLevel?: string[];
      languages?: string[];
      sports?: string[];
      qualifications?: string[];
      occupationalAreas?: string[];
      salary?: string | null;
      city?: string | null;
      country?: string | null;
    };

    const parsedLanguages = Array.isArray(data.languages)
      ? data.languages
      : typeof data.language === 'string' && data.language.trim()
        ? [data.language]
        : [];
    const allowedLanguages = parsedLanguages.filter((lang) =>
      OFFICIAL_LANGUAGES.includes(lang)
    );

    setFormData((prev) => ({
      ...prev,
      ...(data.employmentType != null && data.employmentType !== ''
        ? { type: data.employmentType }
        : {}),
      ...(data.city != null && data.city !== '' ? { city: data.city } : {}),
      ...(data.country != null && data.country !== '' ? { country: data.country } : {}),
      salary: data.salary != null && data.salary.trim() !== '' ? data.salary : '',
      experienceLevel: Array.isArray(data.experienceLevel)
        ? data.experienceLevel
        : prev.experienceLevel,
      languages: allowedLanguages.length > 0 ? allowedLanguages : ['English'],
      sports: Array.isArray(data.sports) ? data.sports : prev.sports,
      qualifications: Array.isArray(data.qualifications)
        ? data.qualifications
        : prev.qualifications,
      occupationalAreas: Array.isArray(data.occupationalAreas)
        ? data.occupationalAreas
        : prev.occupationalAreas,
    }));
  }, [formData]);

  const handleNext = useCallback(async () => {
    const validationErrors = validateStep1(formData);
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setTimeout(() => {
        const el = document.getElementById('error-banner');
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return;
    }

    setParsingDescription(true);
    setError('');
    try {
      await runAutoFillMerge();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STEP1_OK_KEY, 'true');
      }
      router.push('/recruiter/jobs/new/continue');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Auto-fill failed');
    } finally {
      setParsingDescription(false);
    }
  }, [formData, runAutoFillMerge, router]);

  const uploadPictures = useCallback(async (): Promise<string[]> => {
    if (selectedPictures.length === 0) return [];

    const preflight = validateJobPhotoFilesForUpload(selectedPictures);
    if (preflight) {
      setError(preflight);
      throw new Error(preflight);
    }

    setUploadingPictures(true);
    try {
      const uploadFormData = new FormData();
      selectedPictures.forEach((file) => {
        uploadFormData.append('pictures', sanitizeFileForUpload(file));
      });

      const response = await fetch('/api/jobs/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      const text = await response.text();
      if (response.status === 413 || looksLikePayloadTooLargeError(text)) {
        throw new Error(JOB_PHOTO_UPLOAD_TOO_LARGE_MESSAGE);
      }

      let data: { error?: string; paths?: string[] };
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(`Server error: ${text.substring(0, 200)}`);
        }
      } else {
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload pictures');
      }

      return data.paths || [];
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to upload pictures';
      setError(errorMessage);
      throw error;
    } finally {
      setUploadingPictures(false);
    }
  }, [selectedPictures]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationErrors: string[] = [];
    if (!formData.title?.trim()) validationErrors.push('Job Title is required');
    if (!stripHtmlToText(formData.description).trim()) {
      validationErrors.push('Description is required');
    }
    if (!formData.city?.trim()) validationErrors.push('City is required');
    if (!formData.country?.trim()) validationErrors.push('Country is required');
    if (!formData.type?.trim()) validationErrors.push('Employment Type is required');
    if (!formData.occupationalAreas?.length) {
      validationErrors.push('Job Category is required');
    }
    if (
      !formData.applyViaATS &&
      !formData.applyByEmail &&
      !formData.applyByWebsite &&
      !formData.applyByWhatsApp
    ) {
      validationErrors.push('Please select at least one way for candidates to apply.');
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setTimeout(() => {
        document.getElementById('error-banner')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 100);
      return;
    }

    setLoading(true);

    try {
      const picturePaths = await uploadPictures();
      const normalizedCountry = normalizeCountryForStorage(formData.country);

      const { description: cleanDescription, strippedImageCount } =
        sanitizeJobDescriptionForSubmit(formData.description);
      if (strippedImageCount > 0) {
        setFormData((prev) => ({ ...prev, description: cleanDescription }));
      }

      const createPayload = {
        ...formData,
        description: cleanDescription,
        company: company?.name || '',
        country: normalizedCountry,
        status: saveAsDraft ? 'draft' : 'published',
        sports: formData.sports,
        occupationalAreas: formData.occupationalAreas,
        pictures: picturePaths,
        heroImageIndex: heroImageIndex !== null ? heroImageIndex : undefined,
      };

      const sizeError = assertJobJsonPayloadFits(createPayload);
      if (sizeError) {
        setError(sizeError);
        setLoading(false);
        return;
      }

      await jobsApi.create(createPayload);
      picturePreviews.forEach((url) => URL.revokeObjectURL(url));
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STEP1_OK_KEY);
      }
      setShowSuccessModal(true);
      setTimeout(() => {
        router.push('/recruiter');
      }, 3000);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create job';
      setError(errorMessage);
      setTimeout(() => {
        document.getElementById('error-banner')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 100);
    } finally {
      setLoading(false);
    }
  }, [
    formData,
    company,
    heroImageIndex,
    picturePreviews,
    saveAsDraft,
    router,
    uploadPictures,
  ]);

  const value = useMemo<RecruiterNewJobContextValue>(
    () => ({
      user,
      authLoading: Boolean(authLoading),
      company,
      companyLoading,
      formData,
      setFormData,
      previewCountryCode,
      selectedPictures,
      picturePreviews,
      heroImageIndex,
      setHeroImageIndex,
      uploadingPictures,
      optimizingPictures,
      optimizingMessage,
      parsingDescription,
      saveAsDraft,
      setSaveAsDraft,
      error,
      setError,
      loading,
      showSuccessModal,
      handlePictureChange,
      removePicture,
      handleNext,
      handleSubmit,
    }),
    [
      user,
      authLoading,
      company,
      companyLoading,
      formData,
      previewCountryCode,
      selectedPictures,
      picturePreviews,
      heroImageIndex,
      setHeroImageIndex,
      uploadingPictures,
      optimizingPictures,
      optimizingMessage,
      parsingDescription,
      saveAsDraft,
      error,
      loading,
      showSuccessModal,
      handlePictureChange,
      removePicture,
      handleNext,
      handleSubmit,
    ]
  );

  return (
    <RecruiterNewJobContext.Provider value={value}>
      {children}
    </RecruiterNewJobContext.Provider>
  );
}
