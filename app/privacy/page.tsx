'use client';

import Navbar from '../components/Navbar';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                At Chickenloop.com, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We may collect and process the following information:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, location, job preferences.</li>
                <li><strong>Resume Information:</strong> Skills, experience, languages, certifications, uploaded documents (e.g., resume PDFs).</li>
                <li><strong>Employer Information:</strong> Company details, job postings, contact details.</li>
                <li><strong>Usage Data:</strong> IP address, browser type, pages visited, referral source.</li>
                <li><strong>Cookies:</strong> For site functionality, analytics, and job alert subscriptions.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We use your data to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Provide, maintain, and improve our services.</li>
                <li>Match job seekers with employers.</li>
                <li>Send job alert emails (only if you opt-in).</li>
                <li>Respond to user inquiries and support requests.</li>
                <li>Comply with legal obligations.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                We do not sell your personal data to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Legal Bases for Processing</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We process your personal information under the following bases:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Your consent (e.g., subscribing to job alerts).</li>
                <li>To perform our contractual obligations (e.g., creating a user account).</li>
                <li>Compliance with legal obligations.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                We retain your information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.
              </p>
              <p className="text-gray-700 leading-relaxed">
                You may request deletion of your data at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights</h2>
              <p className="text-gray-700 leading-relaxed mb-2">Under GDPR and other data protection laws, you have the right to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Access your data.</li>
                <li>Request correction or deletion.</li>
                <li>Object to or restrict processing.</li>
                <li>Withdraw consent at any time.</li>
                <li>File a complaint with a data protection authority.</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise your rights, contact us at: <a href="mailto:hello@chickenloop.com" className="text-blue-600 hover:underline">hello@chickenloop.com</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                We use cookies to enhance your experience and to analyze website usage. You can manage your cookie preferences through our cookie consent banner here: Cookie Settings
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Third-Party Services</h2>
              <p className="text-gray-700 leading-relaxed">
                We may share your data with trusted third parties (e.g., hosting providers, email service providers) strictly for providing our services. All partners are GDPR-compliant.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                If you are located outside of Spain, please note that your data may be transferred and processed in the USA. We take appropriate safeguards to protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We encourage you to review it periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                For any questions regarding this policy, please contact:
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








