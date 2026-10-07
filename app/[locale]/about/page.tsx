'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Navbar from '@/app/components/Navbar';

export default function AboutPage() {
  const t = useTranslations('About');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{t('title')}</h1>

          <div className="prose prose-lg max-w-none">
            <div className="text-gray-700 leading-relaxed space-y-6">
              <p>{t('p1')}</p>
              <p>{t('p2')}</p>
              <p>{t('p3')}</p>
              <p>{t('p4')}</p>
              <p>{t('p5')}</p>
              <p>{t('p6')}</p>
              <p>{t('p7')}</p>
              <p className="mt-8 font-medium">
                {t('signOff')}
                <br />
                {t('signName')}
              </p>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <Image
              src="https://cy1wkdwruflm9kfu.public.blob.vercel-storage.com/about/sven-rooster.png"
              alt={t('imageAlt')}
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
