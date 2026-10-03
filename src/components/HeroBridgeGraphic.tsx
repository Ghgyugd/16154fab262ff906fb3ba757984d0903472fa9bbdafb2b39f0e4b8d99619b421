import React from 'react';
import { FileText, Target, CheckCircle2 } from 'lucide-react';

interface HeroBridgeGraphicProps {
  className?: string;
}

export const HeroBridgeGraphic: React.FC<HeroBridgeGraphicProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full ${className}`}>
      {/* Structural Span Visual Container with .glass-panel */}
      <div className="glass-panel relative rounded-2xl !bg-white/60 backdrop-blur-2xl border border-white/80 p-3 sm:p-4 shadow-[0_12px_28px_-6px_rgba(11,37,69,0.07),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden">
        {/* Background Subtle Blueprint Grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(141, 169, 196, 0.35) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(141, 169, 196, 0.35) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        {/* 3D Top Specular Highlight Line */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />

        {/* Nodes and Tensile Bridge Graphic */}
        <div className="relative z-10 space-y-2">
          {/* Top Bar with Anchored Badges */}
          <div className="flex items-center justify-between gap-2">
            {/* Left Anchor: Resume you have */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200/90 shadow-2xs">
              <div className="w-5 h-5 rounded-md bg-slate-100 text-[#475569] flex items-center justify-center shrink-0">
                <FileText className="w-3 h-3 text-[#475569]" />
              </div>
              <span className="text-[11px] font-semibold text-[#0B2545]">
                Resume Draft <span className="font-mono font-normal text-[#627D98] text-[10px]">(48%)</span>
              </span>
            </div>

            {/* Center Bridge Indicator */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-cursive text-[#1D4ED8] font-bold">
              <span>alignment span</span>
              <span>&rarr;</span>
            </div>

            {/* Right Anchor: Job you want */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/95 border border-[#1D4ED8]/25 shadow-2xs">
              <div className="w-5 h-5 rounded-md bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0">
                <Target className="w-3 h-3 text-[#1D4ED8]" />
              </div>
              <span className="text-[11px] font-bold text-[#1D4ED8]">
                Target Job <span className="font-mono text-blue-700 text-[10px]">(94%)</span>
              </span>
            </div>
          </div>

          {/* SVG Structural Bridge Span with Cable Lines */}
          <div className="relative w-full h-14 sm:h-16">
            <svg
              className="w-full h-full overflow-hidden"
              viewBox="0 0 600 65"
              fill="none"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Foundation Reference Line */}
              <line x1="20" y1="56" x2="580" y2="56" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />

              {/* Left Pier */}
              <rect x="35" y="26" width="18" height="30" rx="2" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
              <rect x="31" y="23" width="26" height="5" rx="1.5" fill="#94A3B8" />

              {/* Right Pier */}
              <rect x="547" y="26" width="18" height="30" rx="2" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1.2" />
              <rect x="543" y="23" width="26" height="5" rx="1.5" fill="#2563EB" />

              {/* Vertical Tension Suspension Cables */}
              {[95, 140, 185, 230, 275, 325, 370, 415, 460, 505].map((x) => {
                const normalizedX = (x - 300) / 240;
                const cableTopY = 16 + Math.pow(normalizedX, 2) * 30;
                return (
                  <line
                    key={x}
                    x1={x}
                    y1={cableTopY}
                    x2={x}
                    y2="46"
                    stroke="#93C5FD"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                );
              })}

              {/* Horizontal Bridge Deck Line */}
              <line x1="38" y1="46" x2="562" y2="46" stroke="#0B2545" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="42" y1="46" x2="558" y2="46" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="6 4" />

              {/* Suspension Main Cable Catenary Arc */}
              <path
                d="M 44 23 Q 300 52 556 23"
                stroke="url(#bridgeGradient)"
                strokeWidth="2.8"
                fill="none"
                strokeLinecap="round"
              />

              {/* Keystone / Center Apex Marker */}
              <g transform="translate(300, 46)">
                <circle r="5" fill="#1D4ED8" />
                <circle r="9" stroke="#1D4ED8" strokeWidth="1.2" opacity="0.35" className="animate-ping" />
                <circle r="2" fill="#FFFFFF" />
              </g>

              {/* Gradients */}
              <defs>
                <linearGradient id="bridgeGradient" x1="44" y1="23" x2="556" y2="23" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#64748B" />
                  <stop offset="45%" stopColor="#1D4ED8" />
                  <stop offset="55%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Bottom Footnote Line with Clean Badges */}
          <div className="flex items-center justify-between text-[10px] text-[#627D98] pt-1.5 border-t border-slate-100/80">
            <span className="font-medium text-[#475569]">Single-Column .docx</span>
            <span className="font-cursive text-xs text-[#1D4ED8] font-bold">
              STAR Method Calibrated
            </span>
            <span className="font-semibold text-blue-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-600 inline" /> 0 OCR Traps
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
