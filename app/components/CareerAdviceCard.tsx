import Link from 'next/link';
import Image from 'next/image';

interface CareerAdviceCardProps {
  article: {
    id: string;
    title: string;
    picture?: string;
    createdAt: string;
  };
}

export default function CareerAdviceCard({ article }: CareerAdviceCardProps) {
  const formattedDate = new Date(article.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link
      href={`/career-advice/${article.id}`}
      className="bg-white border border-gray-200 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer block overflow-hidden transform hover:-translate-y-1 p-4 sm:p-6 flex flex-col items-center text-center"
    >
      {/* Article Picture */}
      <div className="w-full h-24 sm:h-32 mb-4 bg-gray-200 rounded-lg overflow-hidden relative">
        {article.picture ? (
          <Image
            src={article.picture}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-110"
            sizes="(max-width: 640px) 120px, 160px"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <div className="text-gray-400 text-sm text-center">
              <div className="text-2xl mb-1">📝</div>
              <div className="text-xs">No Picture</div>
            </div>
          </div>
        )}
      </div>

      {/* Article Info */}
      <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
        {article.title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 mt-auto">
        {formattedDate}
      </p>
    </Link>
  );
}
