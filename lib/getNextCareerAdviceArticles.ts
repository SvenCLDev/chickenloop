/** Next articles in newest-first order, wrapping at the end of the list. */
export function getNextCareerAdviceArticles<T extends { id: string }>(
  articles: T[],
  currentId: string,
  count = 3,
): T[] {
  if (articles.length <= 1 || count <= 0) {
    return [];
  }

  const currentIndex = articles.findIndex((article) => article.id === currentId);
  if (currentIndex === -1) {
    return [];
  }

  const result: T[] = [];
  const seen = new Set<string>([currentId]);
  let index = currentIndex;
  let steps = 0;
  const maxSteps = articles.length;

  while (result.length < count && steps < maxSteps) {
    index = (index + 1) % articles.length;
    steps += 1;

    const candidate = articles[index];
    if (seen.has(candidate.id)) {
      continue;
    }

    seen.add(candidate.id);
    result.push(candidate);
  }

  return result;
}
