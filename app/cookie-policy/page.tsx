'use client';

import Navbar from '../components/Navbar';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Cookie Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
              <p className="text-gray-700 leading-relaxed">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
                They are widely used to make websites work more efficiently and provide information to website owners.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Chickenloop.com uses cookies to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Ensure the website functions properly</li>
                <li>Remember your preferences and settings</li>
                <li>Analyze how visitors use our website</li>
                <li>Improve user experience</li>
                <li>Provide personalized content (with your consent)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Types of Cookies We Use</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Necessary Cookies</h3>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    These cookies are essential for the website to function properly. They enable core functionality such as security, 
                    network management, and accessibility. You cannot opt-out of these cookies.
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Examples:</strong> Session management, authentication, security features
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Analytics Cookies</h3>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. 
                    This helps us improve the website's performance and user experience.
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Examples:</strong> Page views, time spent on site, bounce rates
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Marketing Cookies</h3>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    These cookies are used to track visitors across websites to display relevant advertisements. 
                    They may also be used to limit the number of times you see an advertisement.
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Examples:</strong> Ad targeting, conversion tracking, remarketing
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">4. Functional Cookies</h3>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    These cookies enable enhanced functionality and personalization, such as remembering your preferences, 
                    language settings, and other choices you make while using the website.
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Examples:</strong> Language preferences, region settings, user interface customization
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Managing Your Cookie Preferences</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can manage your cookie preferences at any time by:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Clicking on the "Cookie Settings" link in our footer</li>
                <li>Using the cookie consent banner that appears when you first visit our site</li>
                <li>Adjusting your browser settings to block or delete cookies</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Please note that blocking certain cookies may impact your experience on our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 leading-relaxed">
                Some cookies on our website are set by third-party services. We do not control these cookies, 
                and you should refer to the third-party's privacy policy for more information about how they use cookies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Consent</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                In compliance with GDPR, ePrivacy Directive, CCPA/CPRA, and other applicable privacy laws, we:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Obtain your explicit consent before setting non-essential cookies</li>
                <li>Provide clear information about the cookies we use</li>
                <li>Allow you to withdraw your consent at any time</li>
                <li>Maintain records of your consent choices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Updates to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, 
                legal, or regulatory reasons. We encourage you to review this page periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                If you have any questions about our use of cookies, please contact us:
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









