'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  HOMEPAGE_HERO_IMAGES,
  HOMEPAGE_HERO_LCP_ELEMENT_ID,
  HOMEPAGE_HERO_ROTATION_MS,
} from '@/lib/homepageHero';

const ROTATION_IMAGES = HOMEPAGE_HERO_IMAGES.slice(1);

export default function HomepageHeroRotation() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (HOMEPAGE_HERO_IMAGES.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HOMEPAGE_HERO_IMAGES.length);
    }, HOMEPAGE_HERO_ROTATION_MS);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const lcpSlide = document.getElementById(HOMEPAGE_HERO_LCP_ELEMENT_ID);
    if (!lcpSlide) return;
    lcpSlide.style.opacity = activeIndex === 0 ? '1' : '0';
  }, [activeIndex]);

  return (
    <>
      {ROTATION_IMAGES.map((imageSrc, index) => {
        const slideIndex = index + 1;
        return (
          <div
            key={imageSrc}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              activeIndex === slideIndex ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={activeIndex !== slideIndex}
          >
            <Image
              src={imageSrc}
              alt=""
              fill
              loading="lazy"
              quality={60}
              sizes="(max-width: 768px) 100vw, 100vw"
              className="object-cover"
            />
          </div>
        );
      })}
    </>
  );
}
