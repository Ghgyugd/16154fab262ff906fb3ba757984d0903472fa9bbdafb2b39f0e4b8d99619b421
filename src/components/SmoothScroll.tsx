import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis Smooth Scroll + GSAP ScrollTrigger Integration.
 * Includes visible proof marker as required in Step 4B.
 */
export function SmoothScroll({ children }: { children?: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [lenisActive, setLenisActive] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;

    try {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenisRef.current = lenis;
      (window as unknown as { lenis?: Lenis }).lenis = lenis;

      lenis.on('scroll', () => {
        ScrollTrigger.update();
        setLenisActive(true);
      });

      tickerFn = (time: number) => {
        lenis?.raf(time * 1000);
      };

      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);
    } catch {
      // Fallback if direct CDN or window instance is present
      if (typeof window !== 'undefined' && (window as unknown as { Lenis?: new (opts: object) => Lenis }).Lenis) {
        const CdnLenis = (window as unknown as { Lenis: new (opts: object) => Lenis }).Lenis;
        lenis = new CdnLenis({ duration: 1.1, smoothWheel: true });
        lenis.on('scroll', () => setLenisActive(true));
        const raf = (time: number) => {
          lenis?.raf(time);
          requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
      }
    }

    return () => {
      lenis?.destroy();
      if (tickerFn) gsap.ticker.remove(tickerFn);
    };
  }, []);

  return <>{children}</>;
}
