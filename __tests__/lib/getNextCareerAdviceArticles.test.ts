import { getNextCareerAdviceArticles } from '@/lib/getNextCareerAdviceArticles';

const articles = [
  { id: 'a', title: 'Newest' },
  { id: 'b', title: 'Second' },
  { id: 'c', title: 'Third' },
  { id: 'd', title: 'Fourth' },
  { id: 'e', title: 'Fifth' },
  { id: 'f', title: 'Sixth' },
  { id: 'g', title: 'Oldest' },
];

describe('getNextCareerAdviceArticles', () => {
  it('returns empty when only one article exists', () => {
    expect(getNextCareerAdviceArticles([{ id: 'solo', title: 'Only' }], 'solo')).toEqual([]);
  });

  it('returns the next three articles for the newest article', () => {
    expect(getNextCareerAdviceArticles(articles, 'a').map((item) => item.id)).toEqual(['b', 'c', 'd']);
  });

  it('wraps from the oldest article to the three newest', () => {
    expect(getNextCareerAdviceArticles(articles, 'g').map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('wraps near the end of the list', () => {
    expect(getNextCareerAdviceArticles(articles, 'e').map((item) => item.id)).toEqual(['f', 'g', 'a']);
  });

  it('returns fewer than three when only two other articles exist', () => {
    const twoOthers = [
      { id: 'a', title: 'Newest' },
      { id: 'b', title: 'Older' },
    ];
    expect(getNextCareerAdviceArticles(twoOthers, 'a').map((item) => item.id)).toEqual(['b']);
    expect(getNextCareerAdviceArticles(twoOthers, 'b').map((item) => item.id)).toEqual(['a']);
  });

  it('returns empty when current id is not in the list', () => {
    expect(getNextCareerAdviceArticles(articles, 'missing')).toEqual([]);
  });
});
