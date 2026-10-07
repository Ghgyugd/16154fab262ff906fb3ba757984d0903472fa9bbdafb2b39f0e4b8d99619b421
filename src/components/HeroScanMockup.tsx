import React, { useState, useEffect } from 'react';
import {
  FileText,
  Target,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Check,
} from 'lucide-react';

export const HeroScanMockup: React.FC<{ onScanClick?: () => void }> = ({ onScanClick }) => {
  const [displayScore, setDisplayScore] = useState(62);
  const [scanState, setScanState] = useState<'scanning' | 'matched'>('scanning');

  useEffect(() => {
    // Reduced motion: show the final state, no looping animation at all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayScore(94);
      setScanState('matched');
      return;
    }

    // Subtle realistic scan pulse. The inner count-up timer is tracked so it
    // can be cleared both before the next pulse and on unmount — previously
    // it leaked (kept calling setState after the card unmounted) and stacked
    // a new timer on every 8s tick.
    let countUp: number | undefined;
    const runPulse = () => {
      if (countUp !== undefined) clearInterval(countUp);
      setScanState('scanning');
      let score = 58;
      countUp = window.setInterval(() => {
        score += 4;
        if (score >= 94) {
          score = 94;
          setDisplayScore(94);
          setScanState('matched');
          if (countUp !== undefined) {
            clearInterval(countUp);
            countUp = undefined;
          }
        } else {
          setDisplayScore(score);
        }
      }, 50);
    };

    runPulse();
    const timer = window.setInterval(runPulse, 8000);

    return () => {
      clearInterval(timer);
      if (countUp !== undefined) clearInterval(countUp);
    };
  }, []);

  return (
    <div className="relative w-full pt-3">
      {/* Main Mockup Card with Deepened/Softened 3D Shadow */}
      <div className="glass-panel w-full relative rounded-3xl !bg-white/55 backdrop-blur-2xl border border-white/80 shadow-[0_30px_80px_-15px_rgba(11,37,69,0.22),0_12px_32px_-4px_rgba(11,37,69,0.1),0_4px_12px_rgba(11,37,69,0.05),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden transition-all duration-300 hover:shadow-[0_38px_90px_-12px_rgba(29,78,216,0.32),0_16px_40px_-6px_rgba(11,37,69,0.12)] hover:-translate-y-1">
        {/* 3D Top Specular Highlight */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent" />

        {/* Top Window Bar: Clean, authentic SaaS window */}
        <div className="bg-white/40 backdrop-blur-md px-4 py-3 border-b border-white/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning/70 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8]/80 inline-block" />
            </div>
            <span className="text-[11px] font-mono font-bold tracking-tight text-[#0B2545] ml-2">
              resume_matcher_v4.docx
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-wash text-blue-core text-[10px] font-bold border border-blue-pale shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-bright animate-pulse" />
              Resume Preview
            </span>
          </div>
        </div>

        {/* Main Scanner Workspace Grid */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Split View: Left (Resume) vs Right (Job Spec Match) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* LEFT: CANDIDATE RESUME MOCKUP with 3D shadow */}
            <div className="glass-panel relative p-4 rounded-2xl !bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_24px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] flex flex-col justify-between overflow-hidden">
              {/* Animated Laser Scanning Beam */}
              {scanState === 'scanning' && (
                <div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#1D4ED8] to-transparent shadow-[0_0_16px_#1D4ED8] z-20 pointer-events-none"
                  style={{
                    animation: 'laserScan 1.6s ease-in-out infinite',
                  }}
                />
              )}

              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between border-b border-surface pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    </div>
                    <span className="text-xs font-bold text-[#0B2545]">
                      Candidate Experience
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#627D98]">6 Yrs Exp</span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-[#0B2545]">
                    Staff Software Engineer
                  </div>
                  <div className="text-[10px] text-[#334E68] bg-[#F7F9FC]/90 p-2.5 rounded-xl border border-[#8DA9C4]/25 leading-relaxed font-mono shadow-[inset_0_1px_2px_rgba(11,37,69,0.04)]">
                    Architected idempotent payment microservices in TypeScript, reducing p99 latency by 38% under 99.99% availability SLAs.
                  </div>
                </div>

                {/* Extracted tokens */}
                <div>
                  <span className="text-[10px] font-bold text-[#627D98] block mb-1">
                    Extracted ATS Rubrics:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {['TypeScript', 'Microservices', 'p99 Latency', 'Idempotency'].map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1D4ED8]/10 text-[#1D4ED8] border border-[#1D4ED8]/25 shadow-2xs"
                      >
                        <Check className="w-2.5 h-2.5 text-[#1D4ED8]" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 mt-3 border-t border-surface flex items-center justify-between text-[10px] text-[#627D98]">
                <span>Format: Single Column</span>
                <span className="text-blue-core font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-mid inline" /> Text extraction
                </span>
              </div>
            </div>

            {/* RIGHT: JOB SPECIFICATION & MATCH CRITERIA with 3D shadow */}
            <div className="glass-panel p-4 rounded-2xl !bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_24px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-surface pb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-[#0B2545]/10 text-[#0B2545] flex items-center justify-center shrink-0">
                      <Target className="w-3.5 h-3.5 text-[#0B2545]" />
                    </div>
                    <span className="text-xs font-bold text-[#0B2545] truncate">
                      Target Job Description
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-blue-core bg-blue-wash px-3 py-1 rounded-full border border-blue-pale font-bold whitespace-nowrap shrink-0">
                    Stripe • Tech Lead
                  </span>
                </div>

                {/* Skill Matching Checklist */}
                <div className="space-y-2">
                  {[
                    { text: 'Distributed Microservices', match: 'found' },
                    { text: 'TypeScript & Node.js', match: 'found' },
                  ].map((item) => (
                    <div
                      key={item.text}
                      className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-blue-wash/80 border border-blue-pale shadow-2xs"
                    >
                      <span className="text-ink font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-mid shrink-0" />
                        {item.text}
                      </span>
                      <span className="font-mono font-bold text-blue-core">{item.match}</span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-warning-soft/90 border border-warning-border shadow-2xs">
                    <span className="text-warning-strong font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                      AWS ECS Canaries
                    </span>
                    <span className="font-mono font-bold text-warning">Gap — not added</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-surface flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-[#627D98]">
                <span className="w-full sm:w-auto">
                  Fictional candidate. Keyword gaps are shown as gaps — ResumeSetu never adds a
                  keyword you have not evidenced.
                </span>
                <span>Recruiter Scan Priority:</span>
                <span className="font-mono font-bold text-[#0B2545]">Gap report ready</span>
              </div>
            </div>
          </div>

          {/* BOTTOM TELEMETRY BAR with Generous Un-cramped Layout */}
          <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0B2545] via-[#113159] to-[#0B2545] text-white shadow-[0_22px_50px_-8px_rgba(11,37,69,0.48),0_10px_24px_-4px_rgba(11,37,69,0.3),0_2px_8px_rgba(29,78,216,0.2),inset_0_1px_0_rgba(255,255,255,0.25)] overflow-hidden space-y-3.5">
            {/* Ambient Radial Sapphire Glow */}
            <div className="absolute top-0 right-1/4 w-40 h-40 bg-[#1D4ED8]/25 rounded-full blur-2xl pointer-events-none" />

            {/* Top Info Row */}
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] flex items-center justify-center font-mono font-extrabold text-lg shadow-[0_4px_14px_rgba(29,78,216,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] text-white shrink-0">
                  {displayScore}%
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      Target ATS Calibration
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-bright/20 text-blue-pale border border-blue-light/40 font-semibold shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-light" />
                      Ready to Apply
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8DA9C4] mt-0.5 font-medium truncate sm:whitespace-normal">
                    Keyword gaps bridged · Single-column Word output generated
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Button Row */}
            <button
              onClick={onScanClick}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] hover:from-[#1E40AF] hover:via-[#1D4ED8] hover:to-[#2563EB] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_8px_22px_-2px_rgba(29,78,216,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_12px_28px_rgba(29,78,216,0.7)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer relative z-10"
            >
              <span>Scan Your Resume Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
