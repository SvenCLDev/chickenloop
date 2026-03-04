'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/');
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const isRecruiter = user && (user.role === 'recruiter' || user.role === 'admin');
  const isJobSeeker = user && user.role === 'job-seeker';

  return (
    <>
      <nav className="sticky top-0 z-50 bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center h-16">
            {/* Left: Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link href="/" onClick={handleLogoClick} className="flex items-center">
                <Image
                  src="/logo.png"
                  alt="ChickenLoop logo"
                  width={300}
                  height={80}
                  priority
                  className="h-auto w-auto max-h-[50px] sm:max-h-[60px] md:max-h-[70px]"
                />
              </Link>
            </div>

            {/* Center: Navigation Links */}
            <div className="flex items-center space-x-6">
              <Link
                href="/jobs"
                className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Jobs
              </Link>
              <Link
                href="/companies"
                className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Companies
              </Link>
              {isRecruiter && (
                <Link
                  href="/candidates"
                  className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  Candidates
                </Link>
              )}
              <Link
                href="/career-advice"
                className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Guides
              </Link>
              <Link
                href="/map"
                className="px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Map
              </Link>
            </div>

            {/* Right: Primary Action Buttons */}
            <div className="flex items-center space-x-3">
              {!(user && isJobSeeker) && (
                <Link
                  href="/recruiter/jobs/new"
                  className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium text-sm transition-colors shadow-sm"
                >
                  Post Job
                </Link>
              )}
              {!(user && isRecruiter) && (
                <Link
                  href="/job-seeker/cv/new"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-400 font-medium text-sm transition-colors"
                >
                  Post Resume
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    href={`/${user.role === 'admin' ? 'admin' : user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`}
                    className="px-4 py-2 text-white hover:bg-blue-700 rounded-md font-medium text-sm transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-white hover:bg-blue-700 rounded-md font-medium text-sm transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 text-white hover:bg-blue-700 rounded-md font-medium text-sm transition-colors"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex justify-between items-center h-16">
            {/* Left: Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-white hover:text-blue-100 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300"
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Center: Logo */}
            <div className="flex items-center flex-1 justify-center">
              <Link href="/" onClick={handleLogoClick} className="flex items-center">
                <Image
                  src="/logo.png"
                  alt="ChickenLoop logo"
                  width={300}
                  height={80}
                  priority
                  className="h-auto w-auto max-h-[40px]"
                />
              </Link>
            </div>

            {/* Right: Post Job Button */}
            <div className="flex items-center">
              {!(user && isJobSeeker) && (
                <Link
                  href="/recruiter/jobs/new"
                  className="px-3 py-1.5 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium text-xs transition-colors shadow-sm"
                  onClick={closeMobileMenu}
                >
                  Post Job
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 border-t border-blue-700 bg-blue-600">
              <div className="flex flex-col pt-2">
                {/* Primary Actions */}
                <div className="px-4 py-2 border-b border-blue-700 mb-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    Primary Actions
                  </h3>
                  <div className="flex flex-col space-y-1">
                    {!(user && isJobSeeker) && (
                      <Link
                        href="/recruiter/jobs/new"
                        onClick={closeMobileMenu}
                        className="px-4 py-2.5 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium text-sm text-center transition-colors"
                      >
                        Post Job
                      </Link>
                    )}
                    {!(user && isRecruiter) && (
                      <Link
                        href="/job-seeker/cv/new"
                        onClick={closeMobileMenu}
                        className="px-4 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-400 font-medium text-sm text-center transition-colors"
                      >
                        Post Resume
                      </Link>
                    )}
                    {user ? (
                      <>
                        <Link
                          href={`/${user.role === 'admin' ? 'admin' : user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`}
                          onClick={closeMobileMenu}
                          className="px-4 py-2.5 text-white hover:bg-blue-700 rounded-md font-medium text-sm text-center transition-colors"
                        >
                          Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            closeMobileMenu();
                            handleLogout();
                          }}
                          className="px-4 py-2.5 text-white hover:bg-blue-700 rounded-md font-medium text-sm text-center transition-colors"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        onClick={closeMobileMenu}
                        className="px-4 py-2.5 text-white hover:bg-blue-700 rounded-md font-medium text-sm text-center transition-colors"
                      >
                        Login
                      </Link>
                    )}
                  </div>
                </div>

                {/* Browse */}
                <div className="px-4 py-2 border-b border-blue-700 mb-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    Browse
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <Link
                      href="/jobs"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      Jobs
                    </Link>
                    <Link
                      href="/companies"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      Companies
                    </Link>
                    {isRecruiter && (
                      <Link
                        href="/candidates"
                        onClick={closeMobileMenu}
                        className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                      >
                        Candidates
                      </Link>
                    )}
                  </div>
                </div>

                {/* Resources */}
                <div className="px-4 py-2 border-b border-blue-700 mb-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    Resources
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <Link
                      href="/career-advice"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      Career Advice
                    </Link>
                    <Link
                      href="/map"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      Map
                    </Link>
                  </div>
                </div>

                {/* Company */}
                <div className="px-4 py-2">
                  <h3 className="text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
                    Company
                  </h3>
                  <div className="flex flex-col space-y-1">
                    <Link
                      href="/about"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      About
                    </Link>
                    <Link
                      href="/contact"
                      onClick={closeMobileMenu}
                      className="px-4 py-2 rounded hover:bg-blue-700 text-sm"
                    >
                      Contact
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
      {user && (
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end py-2">
              <span className="text-sm text-gray-700">Welcome, {user.name}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
