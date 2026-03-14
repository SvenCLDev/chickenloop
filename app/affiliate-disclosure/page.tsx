'use client';

import Navbar from '../components/Navbar';

export default function AffiliateDisclosurePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Affiliate Disclosure</h1>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <p className="text-gray-700 leading-relaxed">
                In compliance with FTC guidelines, please assume that any links leading you to products or services are affiliate links and that Chickenloop will receive compensation from them. We only recommend services that we believe provide genuine value. This helps us keep the job board 100% free for the community.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
