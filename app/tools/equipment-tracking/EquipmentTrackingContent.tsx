'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import EquipmentWaitlistForm from '@/components/tools/EquipmentWaitlistForm';

const PROBLEM_ITEMS = [
  'Equipment gets used by multiple instructors',
  'Usage and maintenance records are hard to manage',
  'Insurance documentation is difficult',
];

const SOLUTION_ITEMS = [
  'QR sticker on every kite, board and bar',
  'Scan before and after sessions',
  'Automatic usage and maintenance logs',
];

const BENEFIT_ITEMS = [
  {
    title: 'Insurance audit readiness',
    description: 'Generate inspection and maintenance proof PDF documents at the touch of a button',
  },
  {
    title: 'Track equipment lifespan',
    description: 'See usage hours for each of your inventory items over time.',
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
  const searchParams = useSearchParams();
  const waitlistSource = searchParams.get('source')?.trim() || 'equipment-tracking-page';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Hero */}
        <section className="mb-12 sm:mb-16">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            <div className="flex-shrink-0">
              <Image
                src="/QR-safety.png"
                alt="Waterproof QR safety sticker for kitesurf equipment"
                width={140}
                height={140}
                className="w-28 h-28 sm:w-36 sm:h-36 object-contain"
                priority
              />
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-3">
                For kitesurf schools
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
                Equipment Tracking for Kitesurf Schools
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                Track equipment usage, maintenance history and safety inspections with waterproof QR
                codes.
              </p>
            </div>
          </div>
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
                src="/problems.png"
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

          <EquipmentWaitlistForm source={waitlistSource} />
        </section>
      </main>
    </div>
  );
}
