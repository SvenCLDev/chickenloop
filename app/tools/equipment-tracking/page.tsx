import type { Metadata } from 'next';
import EquipmentTrackingContent from './EquipmentTrackingContent';

export const metadata: Metadata = {
  title: 'Equipment Tracking for Kitesurf Schools | Chickenloop',
  description:
    'Track equipment usage, maintenance history and safety inspections with waterproof QR codes. Join early access for kitesurf schools.',
};

export default function EquipmentTrackingPage() {
  return <EquipmentTrackingContent />;
}
