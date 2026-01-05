import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function SectionHeader({ title, actionLabel, actionHref }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-12 gap-4">
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">{title}</h2>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 whitespace-nowrap"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}








