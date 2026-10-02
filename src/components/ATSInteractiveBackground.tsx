import React, { useEffect, useRef, useState } from 'react';

/**
 * Rich Luminous Gradient Mesh Canvas with High-Tech Architectural Grid:
 * - Multi-stop vibrant radiant blooms blending Electric Blue (#1D4ED8), Sky Cyan (#06B6D4 / #38BDF8),
 *   Deep Indigo (#4F46E5), and Midnight Navy (#0B2545)
 * - Crisp, unmistakable architectural coordinate grid with precision intersection accents
 * - Calibrated for high-contrast glassmorphism so cards glow with luminous color
 * - Fluid hardware-accelerated interactive cursor spotlight
 *
 * Performance notes: the spotlight is a fixed-size layer moved purely via
 * `transform: translate3d()` (GPU compositing, no repaint of the gradient) and
 * is updated through a DOM ref — zero React re-renders. The animation loop only
 * runs while the pointer is actually in motion and parks itself once settled.
 * The previous implementation called setState on every animation frame
 * forever, re-rendering this component 60×/second and repainting the blurred
 * layers, which made the whole page feel laggy.
 */
export const ATSInteractiveBackground: React.FC = () => {
  const [isPointerDevice, setIsPointerDevice] = useState(false);
  const spotRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);
  const targetPos = useRef<{ x: number; y: number }>({ x: -2000, y: -2000 });
  const currentPos = useRef<{ x: number; y: number }>({ x: -2000, y: -2000 });

  useEffect(() => {
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasPointer || prefersReducedMotion) return;

    setIsPointerDevice(true);

    // Half the spotlight box — keeps the gradient centred on the cursor.
    const HALF = 310;

    const paint = () => {
      rafId.current = null;
      const target = targetPos.current;
      const current = currentPos.current;
      current.x += (target.x - current.x) * 0.18;
      current.y += (target.y - current.y) * 0.18;

      const spot = spotRef.current;
      if (spot) {
        spot.style.transform = `translate3d(${(current.x - HALF).toFixed(1)}px, ${(current.y - HALF).toFixed(1)}px, 0)`;
      }

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      // Stop the loop once the spotlight has converged on the pointer —
      // idle pages burn no CPU at all until the pointer moves again.
      if (dx * dx + dy * dy > 1) {
        rafId.current = requestAnimationFrame(paint);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (rafId.current === null) rafId.current = requestAnimationFrame(paint);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Base Gradient Canvas with Subtle Color Flow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F2F6FC] via-[#EBF2FA] to-[#EFF5FC]" />

      {/* 2. Top-Right Hero Radiant Bloom: Vibrant Electric Sapphire & Cyan Sky */}
      <div
        className="absolute -top-36 right-[2%] w-[880px] h-[880px] rounded-full blur-[100px] opacity-90"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, rgba(29, 78, 216, 0.32) 0%, rgba(6, 182, 212, 0.22) 35%, rgba(56, 189, 248, 0.16) 55%, transparent 75%)',
        }}
      />

      {/* 3. Top-Left Headline Radiant Bloom: Indigo & Royal Azure */}
      <div
        className="absolute top-6 -left-28 w-[820px] h-[820px] rounded-full blur-[110px] opacity-85"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.26) 0%, rgba(37, 99, 235, 0.22) 38%, rgba(141, 169, 196, 0.18) 60%, transparent 78%)',
        }}
      />

      {/* 4. Center Diagonal Light Ribbon: Electric Blue & Cyan Ice Flow */}
      <div
        className="absolute top-[28%] -right-24 w-[850px] h-[850px] rounded-full blur-[120px] opacity-80"
        style={{
          background:
            'radial-gradient(circle, rgba(29, 78, 216, 0.26) 0%, rgba(56, 189, 248, 0.20) 40%, rgba(96, 165, 250, 0.12) 60%, transparent 75%)',
        }}
      />

      {/* 5. Mid-Page Left Feature Bloom: Azure & Slate Violet */}
      <div
        className="absolute top-[48%] left-[0%] w-[780px] h-[780px] rounded-full blur-[120px] opacity-75"
        style={{
          background:
            'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(141, 169, 196, 0.22) 42%, rgba(29, 78, 216, 0.14) 62%, transparent 78%)',
        }}
      />

      {/* 6. Lower Pricing & Telemetry Bloom: Deep Navy & Electric Sapphire */}
      <div
        className="absolute top-[70%] right-[6%] w-[820px] h-[820px] rounded-full blur-[120px] opacity-80"
        style={{
          background:
            'radial-gradient(circle, rgba(29, 78, 216, 0.24) 0%, rgba(11, 37, 69, 0.18) 45%, rgba(56, 189, 248, 0.12) 65%, transparent 78%)',
        }}
      />

      {/* 7. Bottom Section Ambient Glow */}
      <div
        className="absolute -bottom-28 left-[12%] w-[750px] h-[750px] rounded-full blur-[115px] opacity-70"
        style={{
          background:
            'radial-gradient(circle, rgba(56, 189, 248, 0.20) 0%, rgba(141, 169, 196, 0.20) 45%, rgba(29, 78, 216, 0.12) 65%, transparent 75%)',
        }}
      />

      {/* 8. Crisp Architectural Coordinate Grid Layer */}
      <div
        className="absolute inset-0 opacity-[0.42]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(141, 169, 196, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(141, 169, 196, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }}
      />

      {/* 9. Grid Intersection Crosshair Dots for High-Tech Precision */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(29, 78, 216, 0.35) 1.5px, transparent 0)
          `,
          backgroundSize: '44px 44px',
        }}
      />

      {/* 10. Interactive Cursor Spotlight — fixed-size layer moved by transform
          only (GPU-composited). Positioned off-screen until first movement. */}
      {isPointerDevice && (
        <div
          ref={spotRef}
          className="absolute left-0 top-0 w-[620px] h-[620px] rounded-full will-change-transform"
          style={{
            transform: 'translate3d(-2000px, -2000px, 0)',
            background:
              'radial-gradient(circle, rgba(29, 78, 216, 0.11) 0%, rgba(6, 182, 212, 0.05) 45%, transparent 75%)',
          }}
        />
      )}

      {/* 11. Top Ambient Specular Light & Max-Width Structural Guide Lines */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/75 via-white/25 to-transparent" />
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 border-x border-[#8DA9C4]/25" />
    </div>
  );
};
