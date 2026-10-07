'use client';

import Navbar from '@/app/components/Navbar';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Service govern your use of our website and services. By accessing or using Chickenloop.com, you agree to be bound by these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Accounts</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Users must be 16 years or older.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You agree to provide accurate and complete information.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Resume Submissions and Job Listings</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Job seekers may create profiles and upload resumes.</li>
                <li>Employers may post job opportunities.</li>
                <li>Chickenloop.com is not responsible for the accuracy of user-submitted content.</li>
                <li>We reserve the right to remove any content that we deem inappropriate or in violation of these Terms.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Prohibited Activities</h2>
              <p className="text-gray-700 leading-relaxed mb-2">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Post false, misleading, or inappropriate content.</li>
                <li>Collect information from other users without their consent.</li>
                <li>Upload viruses or malicious code.</li>
                <li>Violate any local, national, or international law.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                All website content, including text, graphics, logos, and software, is the property of Chickenloop.com or its licensors.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You may not reproduce, distribute, or create derivative works without prior written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Disclaimers</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Chickenloop.com acts solely as a platform connecting job seekers and employers.</li>
                <li>We do not guarantee employment outcomes or the authenticity of posted opportunities.</li>
                <li>Your use of the site is at your own risk.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                To the maximum extent permitted by law, Chickenloop.com and its owners are not liable for any indirect, incidental, or consequential damages arising out of your use of the website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to indemnify and hold harmless Chickenloop.com, its affiliates, and employees from any claims or damages resulting from your use of the website or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update these Terms at any time. Continued use of the site after changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms are governed by the laws of Spain. Any disputes will be resolved under the jurisdiction of Spanish courts.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                For any questions about these Terms, please contact:
              </p>
              <p className="text-gray-700 leading-relaxed">
                Email: <a href="mailto:hello@chickenloop.com" className="text-blue-600 hover:underline">hello@chickenloop.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

