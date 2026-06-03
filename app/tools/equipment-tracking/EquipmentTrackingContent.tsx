'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';

const PROBLEM_ITEMS = [
  'Equipment gets used by multiple instructors',
  'Maintenance records are hard to manage',
  'Insurance documentation is difficult',
];

const SOLUTION_ITEMS = [
  'QR sticker on every kite, board and bar',
  'Scan before and after sessions',
  'Automatic maintenance logs',
];

const BENEFIT_ITEMS = [
  {
    title: 'Insurance audit readiness',
    description: 'Keep inspection and maintenance records organized when insurers ask.',
  },
  {
    title: 'Track equipment lifespan',
    description: 'See usage hours and wear across your full fleet over time.',
  },
  {
    title: 'Maintenance history',
    description: 'Log repairs, replacements and safety checks in one place.',
  },
  {
    title: 'Replacement planning',
    description: 'Plan budget and reordering based on real usage data.',
  },
];

export default function EquipmentTrackingContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [country, setCountry] = useState('');
  const [equipmentCount, setEquipmentCount] = useState('');
  const [instructorCount, setInstructorCount] = useState('');
  const [interestedPrice, setInterestedPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/equipment-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          schoolName: schoolName.trim(),
          country: country.trim(),
          equipmentCount: equipmentCount.trim() || undefined,
          instructorCount: instructorCount.trim() || undefined,
          interestedPrice: interestedPrice.trim() || undefined,
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
        setEquipmentCount('');
        setInstructorCount('');
        setInterestedPrice('');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Hero */}
        <section className="text-center mb-12 sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-3">
            For kitesurf schools
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Equipment Tracking for Kitesurf Schools
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Track equipment usage, maintenance history and safety inspections with waterproof QR
            codes.
          </p>
        </section>

        {/* The Problem */}
        <section className="bg-white rounded-lg shadow-md p-6 sm:p-8 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">The Problem</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <ul className="flex-1 space-y-3 text-gray-700">
              {PROBLEM_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="relative w-full md:w-2/5 md:flex-shrink-0 aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src="/problem.png"
                alt="Kitesurf school equipment management challenges"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          </div>
        </section>

        {/* The Solution */}
        <section className="bg-white rounded-lg shadow-md p-6 sm:p-8 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">The Solution</h2>
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <ul className="flex-1 space-y-3 text-gray-700">
              {SOLUTION_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="relative w-full md:w-2/5 md:flex-shrink-0 aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src="/solution.png"
                alt="QR code equipment tracking for kitesurf schools"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center sm:text-left">
            Benefits
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {BENEFIT_ITEMS.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-lg shadow-md p-6 border border-blue-100"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Early Access Signup */}
        <section className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Early Access Signup
          </h2>
          <p className="text-gray-600 mb-6 sm:mb-8">
            Join the waitlist and be first to try equipment tracking built for watersports schools.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="waitlist-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  id="waitlist-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="waitlist-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="you@school.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="waitlist-school" className="block text-sm font-medium text-gray-700 mb-1">
                  School name
                </label>
                <input
                  id="waitlist-school"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Your kitesurf school"
                />
              </div>
              <div>
                <label htmlFor="waitlist-country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  id="waitlist-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="e.g. Spain"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="waitlist-equipment"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Equipment count
                </label>
                <input
                  id="waitlist-equipment"
                  type="number"
                  min={0}
                  value={equipmentCount}
                  onChange={(e) => setEquipmentCount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="e.g. 40"
                />
              </div>
              <div>
                <label
                  htmlFor="waitlist-instructors"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Instructor count
                </label>
                <input
                  id="waitlist-instructors"
                  type="number"
                  min={0}
                  value={instructorCount}
                  onChange={(e) => setInstructorCount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="e.g. 6"
                />
              </div>
              <div>
                <label htmlFor="waitlist-price" className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly price (€)
                </label>
                <input
                  id="waitlist-price"
                  type="number"
                  min={0}
                  value={interestedPrice}
                  onChange={(e) => setInterestedPrice(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="e.g. 49"
                />
              </div>
            </div>

            {status && (
              <p
                className={
                  status.type === 'success'
                    ? 'text-green-600 font-medium'
                    : 'text-red-600 font-medium'
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
              {submitting ? 'Submitting...' : 'Join Early Access'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
