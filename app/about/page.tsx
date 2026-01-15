'use client';

import Navbar from '../components/Navbar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">About Chickenloop</h1>
          
          <div className="prose prose-lg max-w-none">
            <div className="text-gray-700 leading-relaxed space-y-6">
              <p>
                Chickenloop Job Board was created to connect watersports employers and qualified candidates without the hassle and stress that I have personally experienced. I spent far too much time and money in order to find suitable kitesurf, sailing and kayak instructors when setting up a watersports centre in India.
              </p>
              
              <p>
                When I started playing around with the Drupal website framework, I realised that a job board could be easily set up to help watersport center managers to avoid or at least reduce the trouble that I had to go through. Initially the job board was only dedicated to kitesurf and kiteboarding jobs, but with more and more general watersports jobs being listed, I expanded the job board to include all types of watersport jobs ranging from kitesurfing, windsurfing, sailing, SUP, to diving and surfing.
              </p>
              
              <p>
                My intention is purely to help the watersports community, and that is why advertising jobs and posting résumés on this site is completely free. To cover expenses, I do run advertising banners on the site.
              </p>
              
              <p>
                I look forward to being of service and hope the Chicken Loop International Watersports Job Board will be successful and prove useful to some of you.
              </p>
              
              <p className="mt-8 font-medium">
                Happy Splash,<br />
                Sven
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}







