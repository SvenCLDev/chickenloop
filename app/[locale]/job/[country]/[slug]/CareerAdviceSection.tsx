'use client';

import CareerAdviceCard from '@/app/components/CareerAdviceCard';

interface CareerAdviceForCard {
  id: string;
  title: string;
  picture?: string;
  createdAt: string;
}

interface CareerAdviceSectionProps {
  articles: CareerAdviceForCard[];
}

export default function CareerAdviceSection({ articles }: CareerAdviceSectionProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Career Advice</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <CareerAdviceCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
