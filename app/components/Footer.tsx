'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-4 sm:mb-0">
            <p className="text-sm text-gray-300">
              © {new Date().getFullYear()} Chickenloop.com. All rights reserved.
            </p>
          </div>
          <div className="flex items-center space-x-6 flex-wrap justify-center sm:justify-start">
            <Link
              href="/about"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/cookie-settings"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cookie Settings
            </Link>
            <Link
              href="/affiliate-disclosure"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Affiliate Disclosure
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

