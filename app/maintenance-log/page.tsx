import Navbar from '../components/Navbar';

export default function MaintenanceLogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900">Equipment Maintance Log</h1>
      </main>
    </div>
  );
}
