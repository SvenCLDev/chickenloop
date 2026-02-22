'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({ type: 'success', text: data.message || 'Thanks! Your message has been sent.' });
        setName('');
        setEmail('');
        setMessage('');
      } else {
        setStatus({
          type: 'error',
          text: data.error || 'Something went wrong. Please try again or email hello@chickenloop.com.',
        });
      }
    } catch {
      setStatus({
        type: 'error',
        text: 'Something went wrong. Please try again or email hello@chickenloop.com.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Signal the Shore 🚩</h1>

          <div className="prose prose-lg max-w-none">
            <div className="text-gray-700 leading-relaxed space-y-6">
              <p>
                Whether you&apos;ve got a suggestion for the new website, a bug to report, or just want to touch base, I&apos;m always listening.
              </p>
              <p>
                Chickenloop is a community-driven project, and your feedback is the &quot;wind&quot; that helps me figure out which direction to steer the platform next.
              </p>
              <p>
                Keep me in the (chicken) loop and drop me a line.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Where to Find Me</h2>
              <p>
                Chickenloop is a passion project of Sven Kelling (Chesterton Consulting). When I am not managing the code, you&apos;ll usually find me between these two spots:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Miramar Beach, Goa, India 🇮🇳</li>
                <li>Playa de Can Pastilla, Mallorca, Spain 🇪🇸</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Drop a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
                Your Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                What&apos;s on your mind? (Suggestions, feedback, or just a hello)
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder="Your message..."
              />
            </div>
            {status && (
              <p
                className={
                  status.type === 'success'
                    ? 'text-green-600 font-medium'
                    : 'text-red-600 font-medium'
                }
              >
                {status.text}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Sending...' : 'Send Message 🤙'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
