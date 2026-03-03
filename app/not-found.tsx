import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f9f5e1] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full flex flex-col items-center text-center">
        <h1 className="font-sans text-2xl sm:text-3xl font-semibold text-gray-800 mb-6 leading-tight">
          Lost at sea... But we&apos;ll help you find your way back!
        </h1>

        <div className="relative w-full aspect-[4/3] max-w-md mb-8 rounded-xl overflow-hidden shadow-lg">
          <Image
            src="/404-beach.jpg"
            alt="Beach and shore"
            fill
            sizes="(max-width: 640px) 100vw, 28rem"
            className="object-cover"
            priority
          />
        </div>

        <nav className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto sm:justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-full bg-[#1a88c4] text-white font-medium hover:bg-[#2389d1] transition-colors shadow-md"
          >
            Back to Shore
          </Link>
          <Link
            href="/jobs"
            className="px-6 py-3 rounded-full bg-[#1a88c4] text-white font-medium hover:bg-[#2389d1] transition-colors shadow-md"
          >
            Search for Jobs
          </Link>
        </nav>
      </div>
    </div>
  );
}
