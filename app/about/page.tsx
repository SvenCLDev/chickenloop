'use client';

import Image from 'next/image';
import Navbar from '../components/Navbar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">The Chickenloop Story</h1>
          
          <div className="prose prose-lg max-w-none">
            <div className="text-gray-700 leading-relaxed space-y-6">
              <p>
                Back in 2013, I was deep in the grind of launching a watersports center in India. Between the logistics and the lessons, I hit a major snag: hiring. Finding qualified, reliable instructors felt like trying to kite in a dead calm—expensive, exhausting, and going nowhere.
              </p>
              
              <p>
                I knew there had to be a better way to link centers with the talent they need. So, I grabbed a coffee, opened a code editor, and Chickenloop was born.
              </p>
              
              <p>
                We started with kitesurfing, but the community had other plans. As more centers reached out, we expanded to cover the whole horizon—sailing, surfing, diving, SUP, and beyond.
              </p>
              
              <p>
                Fast forward to 2024. The original site was a bit &quot;weathered,&quot; and it was time for a total refit. I&apos;ve spent my recent downtime rebuilding Chickenloop from scratch. The new platform is built on modern tech, designed to be the fastest way to get your crew on the boat or your instructors on the beach.
              </p>
              
              <p>
                This project is for the community. That&apos;s why basic job posts and resumes are free, supported by a few optional premium features to keep us running.
              </p>
              
              <p>
                Whether you&apos;re looking for your next season in the sun or the perfect addition to your team, I hope Chickenloop helps you find your line.
              </p>
              
              <p className="mt-8 font-medium">
                See you on the water,<br />
                Sven
              </p>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <Image
              src="https://cy1wkdwruflm9kfu.public.blob.vercel-storage.com/about/sven-rooster.png"
              alt="Sven"
              width={400}
              height={400}
              className="rounded-lg object-cover shadow-md"
              priority
            />
          </div>
        </div>
      </main>
    </div>
  );
}







