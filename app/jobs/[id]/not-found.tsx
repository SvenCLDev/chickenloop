import Link from 'next/link';
import Navbar from '../../components/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-6">The job you are looking for does not exist.</p>
          <Link href="/jobs" className="text-blue-600 hover:underline font-semibold">
            Return to Jobs
          </Link>
        </div>
      </main>
    </div>
  );
}

