'use client';

import Navbar from '../components/Navbar';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Contact Us</h1>
          
          <div className="prose prose-lg max-w-none">
            <div className="text-gray-700 leading-relaxed space-y-6">
              <p>
                If you have any comments or suggestions, I would like to hear from you
              </p>
              
              <p className="font-medium">
                Keep me in the (chicken) loop and drop me a line
              </p>
              
              <div className="mt-8 space-y-3">
                <p className="font-semibold text-gray-900">
                  Sven Kelling
                </p>
                <p className="text-gray-700">
                  Central Towers<br />
                  Panjim, Goa
                </p>
                <p className="text-gray-700">
                  e: <a href="mailto:hello@chickenloop.com" className="text-blue-600 hover:underline">hello@chickenloop.com</a>
                </p>
                <p className="text-gray-700">
                  m: <a href="tel:+919552821336" className="text-blue-600 hover:underline">+91 955 282 1336</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}




