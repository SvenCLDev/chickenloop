import { Suspense } from 'react';
import ReferenceConfirmContent from './ReferenceConfirmContent';

export default function ReferenceConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
          <p className="text-gray-600">Loading reference request...</p>
        </div>
      }
    >
      <ReferenceConfirmContent />
    </Suspense>
  );
}
