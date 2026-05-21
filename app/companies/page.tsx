'use client';

import { Suspense } from 'react';
import Navbar from '../components/Navbar';
import CompanyList from './CompanyList';

export default function CompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center py-12">Loading companies...</div>
          </main>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <CompanyList />
      </div>
    </Suspense>
  );
}
