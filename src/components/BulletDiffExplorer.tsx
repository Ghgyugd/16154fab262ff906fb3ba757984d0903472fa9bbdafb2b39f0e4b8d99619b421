import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface ExamplePreset {
  role: string;
  uncalibrated: {
    bullet: string;
    critique: string;
    missingTokens: string[];
  };
  tailored: {
    bullet: string;
    methodology: string;
    quantifiableResult: string;
  };
}

const PRESETS: ExamplePreset[] = [
  {
    role: 'Senior Backend Engineer',
    uncalibrated: {
      bullet: 'Worked on payment microservices and fixed database bottlenecks for the checkout team.',
      critique: 'Passive verb "worked on"; zero throughput metrics, no database engine cited, no SLA impact.',
      missingTokens: ['Idempotency', 'PostgreSQL indexing', 'p99 latency', 'Redis caching'],
    },
    tailored: {
      bullet:
        'Architected idempotent payment microservices in Node.js and TypeScript, reducing p99 API response latency by 38% under strict 99.99% availability SLAs.',
      methodology: 'Action Verb + Architecture Scope + Quantitative Business Result',
      quantifiableResult: '38% p99 latency reduction under 99.99% SLA',
    },
  },
  {
    role: 'Growth Product Manager',
    uncalibrated: {
      bullet: 'Responsible for user onboarding improvements and analyzed drop-off funnels in weekly meetings.',
      critique: 'Passive duty phrasing ("responsible for"); missing customer cohort delta and activation lift.',
      missingTokens: ['PLG activation', 'Amplitude cohorts', 'Day-14 retention', 'B2B SaaS'],
    },
    tailored: {
      bullet:
        'Spearheaded self-serve onboarding redesign using Amplitude behavioral cohorts, driving a 41% surge in Day-14 workspace retention across 18,000+ teams.',
      methodology: 'Attributable Leadership + Analytical Mechanism + Verified Metric Lift',
      quantifiableResult: '+41% Day-14 workspace retention at scale',
    },
  },
  {
    role: 'Cloud / DevOps Specialist',
    uncalibrated: {
      bullet: 'Maintained AWS infrastructure, created Docker containers, and helped team with deployments.',
      critique: 'Generic tasks without automation scale, deployment frequency multiplier, or cost optimization.',
      missingTokens: ['Terraform IaC', 'Kubernetes EKS', 'Zero-downtime CI/CD', 'Canary rollouts'],
    },
    tailored: {
      bullet:
        'Automated multi-region AWS EKS deployments using Terraform and GitHub Actions canary pipelines, cutting developer release cycle time from 14 days to 4x daily.',
      methodology: 'Modern IaC Standard + Pipeline Automation + Cycle Time Delta',
      quantifiableResult: '14-day cycle cut to 4x daily automated releases',
    },
  },
];

export const BulletDiffExplorer: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [customBullet, setCustomBullet] = useState('');
  const [customRewritten, setCustomRewritten] = useState<string | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);

  const preset = PRESETS[selectedIdx];

  /**
   * Local structure pass over the visitor's own bullet.
   *
   * The previous version fabricated the output entirely — it took anything the
   * visitor typed and asserted "driving a 34% performance optimization and
   * eliminating recurring downstream bottlenecks", which is exactly the invented
   * achievement ResumeSetu refuses to write into a real resume.
   *
   * This keeps every word the visitor typed, invents nothing, and emits the same
   * `[add metric]` placeholder the tailoring pipeline uses when no number is
   * available. It is explicitly a local helper, not an AI call.
   */
  const handleRewriteCustom = () => {
    if (!customBullet.trim()) return;
    setIsRewriting(true);
    setTimeout(() => {
      const typed = customBullet.trim().replace(/\.$/, '');
      const hasOwnMetric = /\d/.test(typed);
      setCustomRewritten(
        hasOwnMetric
          ? `${typed}\n\nStructure check: lead with your strongest action verb, name the scope, then give the result last. Your own number was kept — verify you can defend it.`
          : `${typed}\n\nStructure check: lead with your strongest action verb, name the scope, then give the result last as [add metric] — ResumeSetu will not invent a number for you.`
      );
      setIsRewriting(false);
    }, 400);
  };

  return (
    <section id="diff-explorer" className="py-20 sm:py-28 border-b border-[#8DA9C4]/30 scroll-mt-16 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-2xl mb-14 sm:mb-18">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-cursive text-2xl text-[#1D4ED8] -rotate-1 font-bold">
              Action + Metric + Impact Formula
            </span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1D4ED8] block mb-2">
            STAR Methodology
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B2545] tracking-tight">
            Transforming Passive Phrases Into{' '}
            <span className="bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">
              Quantified Results
            </span>
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#334E68] leading-relaxed">
            Compare generic phrasing with high-impact STAR bullet points tailored to automated keyword search.
          </p>
        </div>

        {/* Role Preset Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 mb-8">
          {PRESETS.map((p, idx) => (
            <button
              key={p.role}
              onClick={() => {
                setSelectedIdx(idx);
                setCustomRewritten(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-[0_2px_8px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] active:scale-95 ${
                selectedIdx === idx
                  ? 'bg-gradient-to-r from-[#0B2545] to-[#113159] text-white border-[#0B2545] shadow-md'
                  : 'bg-white hover:bg-canvas text-[#0B2545] border-[#8DA9C4]/35'
              }`}
            >
              {p.role}
            </button>
          ))}
        </div>

        {/* 3D Side-by-Side Comparison Card with High Transparency Glassmorphism */}
        <div className="glass-panel surface-panel-strong rounded-3xl p-6 sm:p-9 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* LEFT: Uncalibrated Draft */}
            <div className="p-6 rounded-xl bg-[#F7F9FC] border border-danger-border space-y-4 shadow-[inset_0_2px_6px_rgba(225,29,72,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-danger" />
                  Generic Uncalibrated Draft
                </span>
                <span className="text-[11px] font-semibold text-danger bg-danger-soft px-2.5 py-0.5 rounded-full border border-danger-border">
                  Weak signal
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#0B2545] font-mono leading-relaxed bg-white p-4 rounded-lg border border-line shadow-2xs">
                "{preset.uncalibrated.bullet}"
              </p>

              <div className="space-y-2 text-xs text-[#334E68]">
                <span className="font-bold text-danger-strong block">Why ATS Screener Flags This:</span>
                <p className="text-xs text-[#627D98] leading-relaxed">
                  {preset.uncalibrated.critique}
                </p>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider block mb-2">
                  Omitted Hard Competencies:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {preset.uncalibrated.missingTokens.map((token, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-danger-soft text-danger border border-danger-border font-medium"
                    >
                      - {token}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: STAR Tailored Output */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-wash/70 to-blue-wash/30 border border-blue-pale space-y-4 shadow-[inset_0_2px_6px_rgba(5,150,105,0.04)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-deep uppercase tracking-wider flex items-center gap-1.5">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-blue-mid" />
                  Illustrative rewrite
                </span>
                <span className="text-[11px] font-mono text-blue-core bg-white px-2.5 py-0.5 rounded-full border border-blue-pale font-bold shadow-2xs">
                  Fictional example
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#0B2545] font-mono leading-relaxed bg-white p-4 rounded-lg border border-blue-wash shadow-xs font-medium">
                "{preset.tailored.bullet}"
              </p>

              <div className="space-y-2 text-xs">
                <span className="font-bold text-blue-deep block">Applied Architecture Formula:</span>
                <p className="text-xs text-blue-deep font-medium leading-relaxed">
                  {preset.tailored.methodology}
                </p>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-blue-deep uppercase tracking-wider block mb-1">
                  Verified Outcome:
                </span>
                <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-white text-blue-deep border border-blue-pale shadow-xs">
                  {preset.tailored.quantifiableResult}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Bullet Transformer Sandbox */}
          <div className="mt-8 pt-8 border-t border-surface">
            <span className="text-xs font-bold text-[#0B2545] block mb-3">
              Test with your own resume bullet:
            </span>

            <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0">
              <input
                type="text"
                value={customBullet}
                onChange={(e) => setCustomBullet(e.target.value)}
                placeholder="e.g. Worked on customer portal backend and improved API response time"
                className="flex-1 w-full min-w-0 p-3.5 text-xs sm:text-sm bg-[#F7F9FC] border border-[#8DA9C4]/35 text-[#0B2545] rounded-xl focus:bg-white focus:outline-none focus:border-[#1D4ED8] placeholder:text-[#8DA9C4] transition-all shadow-[inset_0_2px_4px_rgba(11,37,69,0.04)]"
              />
              <button
                onClick={handleRewriteCustom}
                disabled={isRewriting || !customBullet.trim()}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] hover:from-[#1E40AF] hover:via-[#1D4ED8] hover:to-[#2563EB] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_8px_20px_-4px_rgba(29,78,216,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer active:translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                <span>{isRewriting ? 'Restructuring...' : 'Calibrate to STAR'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#627D98] leading-relaxed">
              Illustrative example above, using a fictional candidate. This box is a local
              structure check: it reuses only the words you type, calls no AI, and never invents a
              number — missing results are shown as [add metric]. The workspace runs the same rule
              against your real resume.
            </p>

            {customRewritten && (
              <div className="mt-4 p-4 rounded-xl bg-blue-wash/80 border border-blue-pale text-xs sm:text-sm font-mono text-[#0B2545] whitespace-pre-wrap shadow-xs flex items-start gap-2.5">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-blue-mid shrink-0 mt-0.5" />
                <span className="leading-relaxed">{customRewritten}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
