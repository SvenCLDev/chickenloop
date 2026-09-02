import CareerAdviceCard from '@/app/components/CareerAdviceCard';
import { getNextCareerAdviceArticles } from '@/lib/getNextCareerAdviceArticles';

interface CareerAdviceListItem {
  id: string;
  title: string;
  picture?: string;
  createdAt: string;
}

interface CareerAdviceContinueReadingProps {
  currentArticleId: string;
  articles: CareerAdviceListItem[];
}

export default function CareerAdviceContinueReading({
  currentArticleId,
  articles,
}: CareerAdviceContinueReadingProps) {
  const nextArticles = getNextCareerAdviceArticles(articles, currentArticleId, 3);

  if (nextArticles.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Continue reading</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {nextArticles.map((article) => (
          <CareerAdviceCard key={article.id} article={article} compact />
        ))}
      </div>
    </section>
  );
}
