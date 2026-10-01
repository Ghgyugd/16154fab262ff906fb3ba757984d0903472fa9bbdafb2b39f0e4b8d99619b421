import React, { useEffect, useState, useRef } from 'react';

/**
 * Rich Luminous Gradient Mesh Canvas with High-Tech Architectural Grid:
 * - Multi-stop vibrant radiant blooms blending Electric Blue (#1D4ED8), Sky Cyan (#06B6D4 / #38BDF8),
 *   Deep Indigo (#4F46E5), and Midnight Navy (#0B2545)
 * - Crisp, unmistakable architectural coordinate grid with precision intersection accents
 * - Calibrated for high-contrast glassmorphism so cards glow with luminous color
 * - Fluid hardware-accelerated interactive cursor spotlight
 */
export const ATSInteractiveBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const [isPointerDevice, setIsPointerDevice] = useState(false);
  const targetPos = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasPointer || prefersReducedMotion) return;

    setIsPointerDevice(true);

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
    };

    let currentX = -1000;
    let currentY = -1000;

    const animate = () => {
      currentX += (targetPos.current.x - currentX) * 0.08;
      currentY += (targetPos.current.y - currentY) * 0.08;
      setMousePos({ x: Math.round(currentX), y: Math.round(currentY) });
      rafId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
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

      {/* 10. Interactive Cursor Spotlight (Intensifies local grid & colors smoothly) */}
      {isPointerDevice && mousePos.x > -500 && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(620px circle at ${mousePos.x}px ${mousePos.y}px, rgba(29, 78, 216, 0.11), rgba(6, 182, 212, 0.05) 45%, transparent 75%)`,
          }}
        />
      )}

      {/* 11. Top Ambient Specular Light & Max-Width Structural Guide Lines */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white/75 via-white/25 to-transparent" />
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 border-x border-[#8DA9C4]/25" />
    </div>
  );
};
