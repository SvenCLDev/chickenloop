'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { companyApi } from '@/lib/api';
import {
  getCountryNameFromCode,
  normalizeCountryForStorage,
} from '@/lib/countryUtils';
import { OFFERED_ACTIVITIES_LIST } from '@/lib/offeredActivities';
import { OFFERED_SERVICES_LIST } from '@/lib/offeredServices';
import dynamic from 'next/dynamic';
import UrlInput from '../../../components/form/UrlInput';

// Dynamically import map component to avoid SSR issues
const DraggableMap = dynamic(
  () => import('../../../components/DraggableMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-96 flex items-center justify-center bg-gray-100 border border-gray-200 rounded-lg">
        <span className="text-gray-500">Loading map...</span>
      </div>
    )
  }
);

// Component to display coordinates (prevents hydration mismatch)
function CoordinatesDisplay({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <p className="mt-2 text-sm text-gray-600">Coordinates: Loading...</p>;
  }

  return (
    <p className="mt-2 text-sm text-gray-600">
      Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
    </p>
  );
}

export default function NewCompanyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    coordinates: null as { latitude: number; longitude: number } | null,
    website: '',
    contact: {
      email: '',
      officePhone: '',
      whatsapp: '',
    },
    socialMedia: {
      facebook: '',
      instagram: '',
      tiktok: '',
      youtube: '',
      twitter: '',
    },
    offeredActivities: [] as string[],
    offeredServices: [] as string[],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedPictures, setSelectedPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [uploadingPictures, setUploadingPictures] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const previewCountryCode = normalizeCountryForStorage(formData.address.country);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'recruiter') {
      router.push(`/${user.role === 'admin' ? 'admin' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  // Handle clicks outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for locations when query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (response.ok && data.results) {
          setSearchResults(data.results);
          setShowResults(true);
        }
      } catch (err) {
        // Silently handle errors
      } finally {
        setSearching(false);
      }
    }, 300); // Debounce 300ms

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Mount map when coordinates are set
  useEffect(() => {
    if (formData.coordinates) {
      setMapMounted(true);
    }
  }, [formData.coordinates]);

  const handleLocationSelect = (result: any) => {
    setFormData({
      ...formData,
      address: {
        street: result.address.street || '',
        city: result.address.city || '',
        state: result.address.state || '',
        postalCode: result.address.postalCode || '',
        country: result.address.country ? getCountryNameFromCode(result.address.country) : '',
      },
      coordinates: {
        latitude: result.latitude,
        longitude: result.longitude,
      },
    });
    setSearchQuery(result.displayName);
    setShowResults(false);
    setMapMounted(true);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData({
      ...formData,
      coordinates: {
        latitude: lat,
        longitude: lng,
      },
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError(`Invalid file type: ${file.name}. Only images (JPEG, PNG, WEBP, GIF) are allowed.`);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const errorMessage = `File "${file.name}" is too large (${fileSizeMB} MB). Maximum size is 5MB.`;
      alert(`Warning: ${errorMessage}`);
      setError(errorMessage);
      return;
    }

    setSelectedLogo(file);
    setError('');

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
  };

  const removeLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setSelectedLogo(null);
    setLogoPreview('');
  };

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + selectedPictures.length > 3) {
      setError('Maximum 3 pictures allowed');
      return;
    }

    // Validate file types and sizes
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only images (JPEG, PNG, WEBP, GIF) are allowed.`);
        return;
      }
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const errorMessage = `File "${file.name}" is too large (${fileSizeMB} MB). Maximum size is 5MB.`;
        alert(`Warning: ${errorMessage}`);
        setError(errorMessage);
        return;
      }
    }

    const newPictures = [...selectedPictures, ...files];
    setSelectedPictures(newPictures);
    setError('');

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPicturePreviews([...picturePreviews, ...newPreviews]);
  };

  const removePicture = (index: number) => {
    const newPictures = selectedPictures.filter((_, i) => i !== index);
    const newPreviews = picturePreviews.filter((_, i) => i !== index);
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(picturePreviews[index]);
    
    setSelectedPictures(newPictures);
    setPicturePreviews(newPreviews);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!selectedLogo) return null;

    setUploadingLogo(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('logo', selectedLogo);

      const response = await fetch('/api/company/upload-logo', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      return data.url || null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const uploadPictures = async (): Promise<string[]> => {
    if (selectedPictures.length === 0) return [];

    setUploadingPictures(true);
    try {
      const uploadFormData = new FormData();
      selectedPictures.forEach((file) => {
        uploadFormData.append('pictures', file);
      });

      const response = await fetch('/api/company/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      // Safely parse JSON response
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server error: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload pictures');
      }

      return data.paths || [];
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload pictures';
      setError(errorMessage);
      throw error;
    } finally {
      setUploadingPictures(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate that coordinates are set
    if (!formData.coordinates || !formData.coordinates.latitude || !formData.coordinates.longitude) {
      setShowLocationModal(true);
      return;
    }

    setLoading(true);

    try {
      // Upload logo first
      const logoUrl = await uploadLogo();
      
      // Upload pictures
      const picturePaths = await uploadPictures();

      const normalizedCountry = normalizeCountryForStorage(formData.address.country);
      await companyApi.create({
        ...formData,
        address: {
          ...formData.address,
          country: normalizedCountry || undefined,
        },
        logo: logoUrl,
        pictures: picturePaths,
      });

      // Clean up preview URLs
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      picturePreviews.forEach(url => URL.revokeObjectURL(url));

      // Show success modal
      setShowSuccessModal(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/recruiter');
      }, 3000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create company';
      setError(errorMessage);
      // Scroll to error banner
      setTimeout(() => {
        const errorBanner = document.getElementById('error-banner');
        if (errorBanner) {
          errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Create Company Profile</h1>
          <p className="text-gray-600 mb-6">
            Before you can post jobs, you need to create a company profile. You can only have one company.
          </p>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* Offering Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Offering</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offered Activities (Optional)
                  </label>
                  {formData.offeredActivities.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.offeredActivities.map((activity) => (
                        <span
                          key={activity}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                        >
                          {activity}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                offeredActivities: formData.offeredActivities.filter((a) => a !== activity),
                              })
                            }
                            className="ml-2 text-indigo-600 hover:text-indigo-800"
                            aria-label={`Remove ${activity}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                    {OFFERED_ACTIVITIES_LIST.map((activity) => (
                      <label
                        key={activity}
                        className="flex items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.offeredActivities.includes(activity)}
                          onChange={() => {
                            const exists = formData.offeredActivities.includes(activity);
                            setFormData({
                              ...formData,
                              offeredActivities: exists
                                ? formData.offeredActivities.filter((a) => a !== activity)
                                : [...formData.offeredActivities, activity],
                            });
                          }}
                          className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">{activity}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select any activities that your company offers (multiple selections allowed).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offered Services (Optional)
                  </label>
                  {formData.offeredServices.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.offeredServices.map((service) => (
                        <span
                          key={service}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                        >
                          {service}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                offeredServices: formData.offeredServices.filter((s) => s !== service),
                              })
                            }
                            className="ml-2 text-indigo-600 hover:text-indigo-800"
                            aria-label={`Remove ${service}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="max-h-56 overflow-y-auto border border-gray-300 rounded-md p-3 bg-white">
                    {OFFERED_SERVICES_LIST.map((service) => (
                      <label
                        key={service}
                        className="flex items-center py-2 px-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.offeredServices.includes(service)}
                          onChange={() => {
                            const exists = formData.offeredServices.includes(service);
                            setFormData({
                              ...formData,
                              offeredServices: exists
                                ? formData.offeredServices.filter((s) => s !== service)
                                : [...formData.offeredServices, service],
                            });
                          }}
                          className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">{service}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select any services that your company offers (multiple selections allowed).
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
              
              {/* Step 1: Search for location */}
              <div className="mb-4 relative" ref={searchContainerRef}>
                <label htmlFor="location-search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search for your location *
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Search for your location by entering your company name. (If we can not find your company, enter a location nearby. A map will pop up on which you can move the Pin to the correct location)
                </p>
                <input
                  id="location-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  placeholder="e.g., Tarifa Windsurf Center, Tarifa, Spain"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                {searching && (
                  <div className="absolute right-3 top-20 text-gray-500 text-sm">
                    Searching...
                  </div>
                )}
                
                {/* Dropdown with search results */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleLocationSelect(result)}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
                      >
                        <div className="font-medium text-gray-900">{result.displayName}</div>
                        {(result.address.city || result.address.country) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {[result.address.city, result.address.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Address fields (auto-filled but editable) */}
              <div className="space-y-4 mb-4">
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value },
                      })
                    }
                    placeholder="e.g., 123 Main St"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={formData.address.city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value },
                        })
                      }
                      placeholder="e.g., San Diego"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province
                    </label>
                    <input
                      id="state"
                      type="text"
                      value={formData.address.state}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value },
                        })
                      }
                      placeholder="e.g., CA"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      value={formData.address.postalCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, postalCode: e.target.value },
                        })
                      }
                      placeholder="e.g., 92101"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      id="country"
                      type="text"
                      value={formData.address.country}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, country: e.target.value },
                        })
                      }
                    placeholder="e.g., United States"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the country name in English; we will store the ISO code automatically.
                  </p>
                  {previewCountryCode && (
                    <p className="text-xs text-gray-500 mt-1">
                      Detected ISO: {previewCountryCode}
                    </p>
                  )}
                  </div>
                </div>
              </div>

              {/* Step 3: Map with draggable marker */}
              {formData.coordinates && mapMounted && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fine-tune Location (drag the pin if needed)
                  </label>
                  <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200">
                    <DraggableMap
                      latitude={formData.coordinates.latitude}
                      longitude={formData.coordinates.longitude}
                      onLocationChange={handleLocationChange}
                      companyName={formData.name || 'Location'}
                    />
                  </div>
                  <CoordinatesDisplay 
                    latitude={formData.coordinates.latitude}
                    longitude={formData.coordinates.longitude}
                  />
                </div>
              )}
            </div>

            {/* Contact Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
              
              <div className="space-y-4">
                <UrlInput
                  label="Website"
                  name="website"
                  value={formData.website}
                  onChange={(value) => setFormData({ ...formData, website: value })}
                  placeholder="example.com"
                />

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={formData.contact.email}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      contact: { ...formData.contact, email: e.target.value }
                    })}
                    placeholder="example@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="contact-office-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Office Phone
                  </label>
                  <input
                    id="contact-office-phone"
                    type="tel"
                    value={formData.contact.officePhone}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      contact: { ...formData.contact, officePhone: e.target.value }
                    })}
                    placeholder="+34 912345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: +[country code][number] (e.g., +34 912345678)
                  </p>
                </div>

                <div>
                  <label htmlFor="contact-whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp
                  </label>
                  <input
                    id="contact-whatsapp"
                    type="tel"
                    value={formData.contact.whatsapp}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      contact: { ...formData.contact, whatsapp: e.target.value }
                    })}
                    placeholder="+34 912345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: +[country code][number] (e.g., +1 234 567 8900)
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Social Media</h3>
              <div className="space-y-4">
                <UrlInput
                  label="Facebook URL"
                  name="facebook"
                  value={formData.socialMedia.facebook}
                  onChange={(value) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, facebook: value } })}
                  placeholder="facebook.com/yourpage"
                />
                <UrlInput
                  label="Instagram URL"
                  name="instagram"
                  value={formData.socialMedia.instagram}
                  onChange={(value) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, instagram: value } })}
                  placeholder="instagram.com/yourpage"
                />
                <UrlInput
                  label="TikTok URL"
                  name="tiktok"
                  value={formData.socialMedia.tiktok}
                  onChange={(value) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, tiktok: value } })}
                  placeholder="tiktok.com/@yourpage"
                />
                <UrlInput
                  label="YouTube URL"
                  name="youtube"
                  value={formData.socialMedia.youtube}
                  onChange={(value) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, youtube: value } })}
                  placeholder="youtube.com/@yourchannel"
                />
                <UrlInput
                  label="X (Twitter) URL"
                  name="twitter"
                  value={formData.socialMedia.twitter}
                  onChange={(value) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, twitter: value } })}
                  placeholder="x.com/yourhandle"
                />
              </div>
            </div>

            {/* Logo Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h3>
              
              <div>
                <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Logo (Optional)
                </label>
                {logoPreview && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Logo Preview:</p>
                    <div className="relative inline-block group">
                      <img
                        src={logoPreview}
                        alt="Company Logo Preview"
                        className="w-32 h-32 object-contain rounded-lg border border-gray-300 bg-white p-2"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                        aria-label="Remove logo"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                <input
                  id="logo"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleLogoChange}
                  disabled={uploadingLogo}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum 5MB. Supported formats: JPEG, PNG, WEBP, GIF. Recommended: Square image (e.g., 200x200px)
                </p>
              </div>
            </div>

            {/* Pictures Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pictures</h3>
              
              <div>
                <label htmlFor="pictures" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Pictures (Optional - up to 3)
                </label>
                <input
                  id="pictures"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handlePictureChange}
                  disabled={selectedPictures.length >= 3 || uploadingPictures}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Maximum 3 pictures, 5MB each. Supported formats: JPEG, PNG, WEBP, GIF
                </p>
                {selectedPictures.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {picturePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => removePicture(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                          aria-label="Remove picture"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error banner near submit button */}
            {error && (
              <div id="error-banner" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <button
                    onClick={() => setError('')}
                    className="text-red-700 hover:text-red-900 ml-4"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                disabled={loading || uploadingPictures || uploadingLogo}
              >
                {loading || uploadingPictures || uploadingLogo ? 'Creating...' : 'Create Company'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Location Required Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Location Required</h2>
            <p className="text-gray-700 mb-6">
              Please define the location of your company. If you can not find it, type the name of the closest town and move the Pin on the map to your location.
            </p>
            <button
              onClick={() => setShowLocationModal(false)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="mb-4 flex justify-center items-center" style={{ minHeight: '200px' }}>
              <img
                src="/success-chicken.gif"
                alt="Success"
                className="max-w-xs w-auto h-auto"
                style={{ maxHeight: '300px', display: 'block', objectFit: 'contain' }}
                onLoad={() => console.log('Success GIF loaded')}
                onError={(e) => {
                  console.error('Failed to load success GIF:', e);
                  // Keep the image element but it won't display if file doesn't exist
                }}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Company Profile has been listed successfully
            </h2>
            <p className="text-gray-600 mb-4">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


