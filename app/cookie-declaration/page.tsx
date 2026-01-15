'use client';

import Navbar from '../components/Navbar';

export default function CookieDeclarationPage() {
  const cookies = [
    {
      name: 'session',
      category: 'Necessary',
      purpose: 'Maintains user session and authentication state',
      provider: 'Chickenloop.com',
      expiry: 'Session',
      type: 'HTTP Cookie',
    },
    {
      name: 'chickenloop_cookie_consent',
      category: 'Necessary',
      purpose: 'Stores your cookie consent preferences',
      provider: 'Chickenloop.com',
      expiry: '1 year',
      type: 'HTTP Cookie',
    },
    {
      name: '_ga',
      category: 'Analytics',
      purpose: 'Used by Google Analytics to distinguish users',
      provider: 'Google',
      expiry: '2 years',
      type: 'HTTP Cookie',
    },
    {
      name: '_gid',
      category: 'Analytics',
      purpose: 'Used by Google Analytics to distinguish users',
      provider: 'Google',
      expiry: '24 hours',
      type: 'HTTP Cookie',
    },
    {
      name: '_gat',
      category: 'Analytics',
      purpose: 'Used by Google Analytics to throttle request rate',
      provider: 'Google',
      expiry: '1 minute',
      type: 'HTTP Cookie',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Cookie Declaration</h1>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <p className="text-gray-700 leading-relaxed mb-4">
                This page provides detailed information about the cookies used on Chickenloop.com. 
                Cookies are categorized by their purpose and can be managed through your cookie preferences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Categories</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">Necessary</span>
                    Always Active
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    These cookies are essential for the website to function and cannot be switched off. 
                    They are usually set in response to actions made by you, such as setting privacy preferences, 
                    logging in, or filling in forms.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">Analytics</span>
                    Optional
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    These cookies help us understand how visitors interact with our website by collecting 
                    and reporting information anonymously.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-sm">Marketing</span>
                    Optional
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    These cookies are used to track visitors across websites to display relevant advertisements.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm">Functional</span>
                    Optional
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    These cookies enable enhanced functionality and personalization.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Cookie List</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                        Cookie Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                        Purpose
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                        Provider
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                        Expiry
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cookies.map((cookie, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {cookie.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className={`px-2 py-1 rounded text-xs ${
                            cookie.category === 'Necessary' ? 'bg-blue-100 text-blue-800' :
                            cookie.category === 'Analytics' ? 'bg-green-100 text-green-800' :
                            cookie.category === 'Marketing' ? 'bg-purple-100 text-purple-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {cookie.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {cookie.purpose}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {cookie.provider}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {cookie.expiry}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Your Cookie Preferences</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can update your cookie preferences at any time by visiting our{' '}
                <a href="/cookie-settings" className="text-blue-600 hover:underline">Cookie Settings</a> page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Last Updated</h2>
              <p className="text-gray-700 leading-relaxed">
                This cookie declaration was last updated on {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}









