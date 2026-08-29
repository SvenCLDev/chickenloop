const VALUE_PROPS = [
  {
    title: 'Verified qualifications',
    description:
      'Upload certificates so recruiters see confirmed credentials—not just claims.',
  },
  {
    title: 'Trusted work history',
    description:
      'Seasonal experience and references from past centres, structured for watersports roles.',
  },
  {
    title: 'Jobs & talent in one place',
    description:
      'Post openings, browse candidates, and build your crew—all in a niche network that gets the industry.',
  },
];

export default function HomepageValueProps() {
  return (
    <section className="bg-gray-50 pt-8 pb-12 sm:pt-10 sm:pb-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-10">
          Built for watersports hiring
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALUE_PROPS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"
                aria-hidden="true"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
