/** Lightweight placeholder while the homepage client bundle loads. */
export default function HomePageBelowFoldPlaceholder() {
  return (
    <div className="bg-gray-50 border-b border-gray-200" aria-hidden="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-12 max-w-3xl mx-auto rounded-lg bg-gray-200/80 animate-pulse" />
      </div>
    </div>
  );
}
