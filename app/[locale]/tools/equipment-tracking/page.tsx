import type { Metadata } from 'next';
import { Suspense } from 'react';
import EquipmentTrackingContent from './EquipmentTrackingContent';

export const metadata: Metadata = {
  title: 'Equipment Tracking for Kitesurf Schools | Chickenloop',
  description:
    'Track equipment usage, maintenance history and safety inspections with waterproof QR codes. Join early access for kitesurf schools.',
};

export default function EquipmentTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <EquipmentTrackingContent />
    </Suspense>
  );
}
