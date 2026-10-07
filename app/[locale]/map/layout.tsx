import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watersports World Map | ChickenLoop',
  description: 'Explore jobs and companies on the world map.',
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
