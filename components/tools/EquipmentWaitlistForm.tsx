'use client';

import { useState } from 'react';

const KITE_BANDS = ['1-20', '21-50', '51-100', '100+'] as const;
const INSTRUCTOR_BANDS = ['1-5', '6-10', '11-20', '20+'] as const;
const PRICE_OPTIONS = [
  { label: '€19/month', value: '19' },
  { label: '€39/month', value: '39' },
  { label: '€79/month', value: '79' },
  { label: 'Not interested yet', value: '0' },
] as const;

/** Map UI band labels to representative counts for analytics. */
function kiteBandToCount(band: string): number | undefined {
  switch (band) {
    case '1-20':
      return 20;
    case '21-50':
      return 50;
    case '51-100':
      return 100;
    case '100+':
      return 101;
    default:
      return undefined;
  }
}

function instructorBandToCount(band: string): number | undefined {
  switch (band) {
    case '1-5':
      return 5;
    case '6-10':
      return 10;
    case '11-20':
      return 20;
    case '20+':
      return 21;
    default:
      return undefined;
  }
}

const inputClassName =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white';

export interface EquipmentWaitlistFormProps {
  /** Stored on submission; defaults to equipment-tracking-page */
  source?: string;
  className?: string;
}

export default function EquipmentWaitlistForm({
  source = 'equipment-tracking-page',
  className = '',
}: EquipmentWaitlistFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [country, setCountry] = useState('');
  const [kiteBand, setKiteBand] = useState('');
  const [instructorBand, setInstructorBand] = useState('');
  const [priceOption, setPriceOption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    const equipmentCount = kiteBandToCount(kiteBand);
    const instructorCount = instructorBandToCount(instructorBand);
    const interestedPrice =
      priceOption === '' ? undefined : Number(priceOption);

    try {
      const res = await fetch('/api/equipment-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          schoolName: schoolName.trim() || undefined,
          country: country.trim() || undefined,
          equipmentCount,
          instructorCount,
          interestedPrice: interestedPrice === 0 ? 0 : interestedPrice,
          source,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus({
          type: 'success',
          text: data.message || 'Thanks! You are on the early access list.',
        });
        setName('');
        setEmail('');
        setSchoolName('');
        setCountry('');
        setKiteBand('');
        setInstructorBand('');
        setPriceOption('');
      } else {
        setStatus({
          type: 'error',
          text: data.error || 'Something went wrong. Please try again.',
        });
      }
    } catch {
      setStatus({
        type: 'error',
        text: 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`.trim()}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="equipment-waitlist-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="equipment-waitlist-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClassName}
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="equipment-waitlist-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="equipment-waitlist-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            placeholder="you@school.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="equipment-waitlist-school" className="block text-sm font-medium text-gray-700 mb-1">
            School Name
          </label>
          <input
            id="equipment-waitlist-school"
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className={inputClassName}
            placeholder="Your kitesurf school"
          />
        </div>
        <div>
          <label htmlFor="equipment-waitlist-country" className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <input
            id="equipment-waitlist-country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClassName}
            placeholder="e.g. Spain"
          />
        </div>
      </div>

      <div>
        <label htmlFor="equipment-waitlist-kites" className="block text-sm font-medium text-gray-700 mb-1">
          How many kites do you manage? <span className="text-red-500">*</span>
        </label>
        <select
          id="equipment-waitlist-kites"
          required
          value={kiteBand}
          onChange={(e) => setKiteBand(e.target.value)}
          className={inputClassName}
        >
          <option value="">Select a range</option>
          {KITE_BANDS.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="equipment-waitlist-instructors"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          How many instructors? <span className="text-red-500">*</span>
        </label>
        <select
          id="equipment-waitlist-instructors"
          required
          value={instructorBand}
          onChange={(e) => setInstructorBand(e.target.value)}
          className={inputClassName}
        >
          <option value="">Select a range</option>
          {INSTRUCTOR_BANDS.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="equipment-waitlist-price" className="block text-sm font-medium text-gray-700 mb-1">
          Would you pay for this solution? <span className="text-red-500">*</span>
        </label>
        <select
          id="equipment-waitlist-price"
          required
          value={priceOption}
          onChange={(e) => setPriceOption(e.target.value)}
          className={inputClassName}
        >
          <option value="">Select an option</option>
          {PRICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {status && (
        <p
          className={
            status.type === 'success' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
          }
        >
          {status.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Submitting...' : 'Get Early Access'}
      </button>
    </form>
  );
}
