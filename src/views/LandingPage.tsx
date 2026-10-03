import React, { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiSparklesIcon,
  Target02Icon,
  Shield01Icon,
  CheckmarkCircle02Icon,
  FileValidationIcon,
} from '@hugeicons/core-free-icons';
import {
  ChevronDown,
  Check,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { HeroScanMockup } from '../components/HeroScanMockup.js';
import { HeroBridgeGraphic } from '../components/HeroBridgeGraphic.js';
import { ThreeStepPipeline } from '../components/ThreeStepPipeline.js';
import { CapabilitiesBento } from '../components/CapabilitiesBento.js';
import { AtsPipelineDiagram } from '../components/AtsPipelineDiagram.js';
import { BulletDiffExplorer } from '../components/BulletDiffExplorer.js';
import { Logo } from '../components/Logo.js';
import { FREE_SCAN_LIMIT, PRO_PRICE_INR } from '../config.js';

interface LandingPageProps {
  onScanClick: () => void;
  onOpenPaywall: () => void;
  onOpenDeleteData: () => void;
}

const FAQS = [
  {
    question: 'How does ResumeSetu identify gaps between my resume and the job?',
    answer:
      'Our engine compares semantic token proximity and recruiter screening rubrics from both your resume and the target job posting. It flags missing technical competencies, hard tools, and quantifiable benchmarks expected by Greenhouse, Lever, and Workday.',
  },
  {
    question: 'Does the system invent or fabricate career history?',
    answer:
      'Strictly zero. Factual integrity is our foundational rule. ResumeSetu restructures and rephrases your authentic experience using the Google STAR formula (Situation, Task, Action, Result) and target vocabulary without fabricating companies, dates, or credentials.',
  },
  {
    question: 'What file format do I get upon export?',
    answer:
      'You receive an editable Microsoft Word (.docx) document laid out in a single column, which is the layout applicant tracking parsers read most reliably, plus a matching custom cover letter. We do not submit your file to third-party parsers, so we cannot claim a pass rate.',
  },
  {
    question: `Why ₹${PRO_PRICE_INR}/month instead of pay-per-resume?`,
    answer:
      `Active job seekers submit dozens of tailored applications. Charging ₹500 or ₹1,000 per resume penalizes persistent applicants. ResumeSetu Pro gives you unlimited resume scans and tailoring for less than ₹9/day until you land your next role.`,
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes, in one click directly from your account menu. Zero lock-in, no phone calls or customer service emails needed, and you retain Pro access through your billing cycle.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onScanClick,
  onOpenPaywall,
  onOpenDeleteData,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="relative w-full max-w-full min-h-screen text-[#0B2545] selection:bg-[#0B2545] selection:text-white overflow-x-hidden">
      {/* =========================================================================
          1. HERO SECTION: BOLD CLEAN HEADLINE + BLUE & LIGHT-BLUE GRADIENTS + 3D
         ========================================================================= */}
      <section id="hero" className="relative pt-24 sm:pt-28 lg:pt-32 pb-16 sm:pb-24 border-b border-[#8DA9C4]/30 w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start w-full min-w-0">
            {/* Left Col: Master Value Proposition */}
            <div className="lg:col-span-6 space-y-6 w-full min-w-0">
              {/* Handwritten Cursive Pre-headline (No Emoji) */}
              <div className="flex items-center gap-2">
                <span className="font-cursive text-2xl sm:text-3xl text-[#1D4ED8] -rotate-2 font-bold select-none tracking-wide">
                  From raw draft to recruiter shortlist
                </span>
              </div>

              {/* Bold Clean Headline with Blue and Light Blue Gradient */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0B2545] leading-[1.12]">
                Bridge the gap between your{' '}
                <span className="bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">
                  resume
                </span>{' '}
                and your{' '}
                <span className="bg-gradient-to-r from-[#1D4ED8] via-[#3B82F6] to-[#93C5FD] bg-clip-text text-transparent">
                  next opportunity
                </span>
                .
              </h1>

              {/* Structural Bridge Graphic Element Connecting "resume you have" to "job you want" */}
              <HeroBridgeGraphic />

              {/* Short, Punchy Sub-headline */}
              <p className="text-base sm:text-lg text-[#334E68] max-w-xl leading-relaxed">
                Scan your resume against any job description. Uncover missing keyword tokens, reverse-engineer recruiter screening rubrics, and export ATS-compliant single-column Word documents.
              </p>

              {/* What the product actually returns — no unverifiable success statistics */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_4px_16px_rgba(11,37,69,0.04),inset_0_1px_0_rgba(255,255,255,0.95)] max-w-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/70 shadow-2xs">
                    <Check className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0B2545] block leading-tight">0–100</span>
                    <span className="text-[10px] text-[#627D98] block font-medium">Match Score</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 border-x border-[#8DA9C4]/25 px-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-200/70 shadow-2xs">
                    <Zap className="w-4 h-4 text-[#1D4ED8] fill-[#1D4ED8]/20" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0B2545] block leading-tight">Live</span>
                    <span className="text-[10px] text-[#627D98] block font-medium">Keyword Scan</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pl-1">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/70 shadow-2xs">
                    <HugeiconsIcon icon={Shield01Icon} size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#0B2545] block leading-tight">Yours</span>
                    <span className="text-[10px] text-[#627D98] block font-medium">Your Resume Only</span>
                  </div>
                </div>
              </div>

              {/* 3D Elevated Action Buttons with Rich Gradient */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-xl">
                <button
                  type="button"
                  onClick={onScanClick}
                  className="flex-1 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] hover:from-[#1E40AF] hover:via-[#1D4ED8] hover:to-[#2563EB] transition-all cursor-pointer flex items-center justify-center gap-3 shadow-[0_12px_28px_-4px_rgba(29,78,216,0.5),0_4px_12px_-2px_rgba(29,78,216,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_16px_36px_-4px_rgba(29,78,216,0.65)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                >
                  <HugeiconsIcon icon={AiSparklesIcon} size={18} className="text-white" />
                  <span>Analyze Your Resume Free</span>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </span>
                </button>

                <a
                  href="#how-it-works"
                  className="px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-[#0B2545] hover:text-[#1D4ED8] bg-gradient-to-b from-white to-[#F0F4F8] hover:from-[#F0F4F8] hover:to-white border border-[#8DA9C4]/40 shadow-[0_6px_18px_-2px_rgba(11,37,69,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:shadow-[0_10px_24px_-2px_rgba(11,37,69,0.12)] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                >
                  <HugeiconsIcon icon={Target02Icon} size={18} className="text-[#1D4ED8]" />
                  <span>How It Works</span>
                </a>
              </div>

              {/* CLEAN HORIZONTAL COMPARISON BAR (What you send in / what you get back) */}
              <div className="glass-panel p-4 sm:p-5 rounded-2xl !bg-white/55 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] max-w-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0B2545]">Resume Match Calibration</span>
                    <span className="font-cursive text-base text-[#1D4ED8] font-bold">
                      Measured on your own scan
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#627D98] font-bold uppercase">
                    ATS Audit
                  </span>
                </div>

                {/* What the engine reads vs. what it reports back */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Input side */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#627D98]" />
                        <span className="font-semibold text-[#475569]">Input: Your Resume + Job Post</span>
                      </div>
                      <span className="font-mono font-bold text-[#334E68] bg-white border border-[#CBD5E1] px-2.5 py-0.5 rounded-full text-[10px] shadow-2xs">
                        Text Extraction
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-200/80 overflow-hidden p-0.5 shadow-inner">
                      <div
                        className="h-full rounded-full bg-[#627D98] transition-all duration-1000 shadow-sm"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Output side */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="font-bold text-[#1D4ED8]">Output: Score + Keyword Gaps</span>
                      </div>
                      <span className="font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-[10px] shadow-2xs">
                        0–100 Match
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-blue-100/80 overflow-hidden p-0.5 shadow-inner">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-blue-500 transition-all duration-1000 shadow-sm"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Plain language reassurance points */}
                <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-[11px] text-[#627D98] pt-2 border-t border-slate-200/60">
                  <span className="flex items-center gap-1.5 font-bold text-[#0B2545] whitespace-nowrap">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {FREE_SCAN_LIMIT} free scans / month
                  </span>
                  <span className="text-slate-300 hidden sm:inline">·</span>
                  <span className="font-medium whitespace-nowrap">Single-column Word</span>
                  <span className="text-slate-300 hidden sm:inline">·</span>
                  <span className="font-medium whitespace-nowrap">Encrypted at rest, delete anytime</span>
                </div>
              </div>
            </div>

            {/* Right Col: Interactive Visual Mockup with 3D Depth */}
            <div className="lg:col-span-6 w-full min-w-0">
              <HeroScanMockup onScanClick={onScanClick} />
            </div>
          </div>

          {/* The previous "Candidates Interviewed & Hired At" logo strip and the
              named-case-study section were removed: they asserted employer
              endorsements and candidate outcomes that were never verified. */}
        </div>
      </section>

      {/* =========================================================================
          2. STRUCTURE: VISUAL 3-STEP PIPELINE (Upload -> Analyze -> Land Job)
         ========================================================================= */}
      <ThreeStepPipeline onScanClick={onScanClick} />

      {/* =========================================================================
          3. BENTO GRID FEATURES: Gap Finder, AI-Tailored Resume, Cover Letter, Application Tracker
         ========================================================================= */}
      <CapabilitiesBento onScanClick={onScanClick} />

      {/* =========================================================================
          4. ATS PIPELINE DIAGRAM: Interactive Architecture
         ========================================================================= */}
      <AtsPipelineDiagram />

      {/* =========================================================================
          5. STAR BULLET DIFF EXPLORER: Before vs After Sandbox
         ========================================================================= */}
      <BulletDiffExplorer />

      {/* =========================================================================
          6. WHAT THE PRODUCT REPORTS BACK
             Replaces a "verified case study" section whose candidates, offers and
             score lifts were invented, and which we cannot substantiate.
         ========================================================================= */}
      <section id="proof" className="py-20 sm:py-28 border-b border-[#8DA9C4]/30 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1D4ED8] mb-2">
              <HugeiconsIcon icon={Target02Icon} size={16} className="text-[#1D4ED8]" />
              <span>What Every Scan Reports</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B2545] tracking-tight">
              Facts From Your Own Documents
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#334E68] leading-relaxed">
              We do not publish candidate success stories we cannot verify. Instead, here is exactly
              what every scan hands back to you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: '0–100 Match Score',
                body: 'A keyword-coverage score computed between your resume text and the job description you pasted. Same inputs, same score, every time.',
              },
              {
                title: 'Keyword Gap List',
                body: 'The specific terms the job asks for that your resume does not contain, listed verbatim so you can decide which ones you actually have experience with.',
              },
              {
                title: 'STAR Guidance',
                body: 'A prompt per missing keyword telling you which bullet to write. It never writes your achievements for you and never invents a metric.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-7 sm:p-8 rounded-3xl bg-white/55 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] space-y-3"
              >
                <div className="flex items-center gap-2">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-blue-600" />
                  <h3 className="text-base font-bold text-[#0B2545]">{item.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-[#334E68] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. PRICING LAYOUT: TWO SIDE-BY-SIDE 3D CARDS (Free vs Pro)
             Pro Card is Highly Prominent with Dark Navy Background & Electric Blue Button
         ========================================================================= */}
      <section id="pricing" className="py-20 sm:py-28 border-b border-[#8DA9C4]/30 scroll-mt-16 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1D4ED8] block mb-2">
              Transparent Membership
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B2545] tracking-tight">
              Invest Less Than ₹9/Day In Your Career
            </h2>
            <p className="mt-3 text-base sm:text-lg text-[#334E68] leading-relaxed">
              Start free with {FREE_SCAN_LIMIT} resume audits every month. Upgrade to Pro for unlimited tailoring across every opportunity until you sign your offer.
            </p>
          </div>

          {/* Two Side-by-Side Pricing Cards with High 3D Elevation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* ----------------- FREE CARD (HIGH TRANSPARENCY GLASSMORPHISM) ----------------- */}
            <div className="p-8 sm:p-9 rounded-3xl bg-white/45 backdrop-blur-2xl border border-white/70 shadow-[0_20px_50px_-10px_rgba(11,37,69,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] hover:shadow-[0_28px_60px_-10px_rgba(29,78,216,0.22)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent" />

              <div className="space-y-4">
                <span className="text-xs font-bold text-[#627D98] uppercase tracking-wider block">
                  Free Forever
                </span>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-[#0B2545]">₹0</span>
                  <span className="text-xs text-[#627D98]">/ forever</span>
                </div>

                <p className="text-xs sm:text-sm text-[#334E68] leading-relaxed">
                  Evaluate resume compatibility on {FREE_SCAN_LIMIT} targeted job descriptions every single month.
                </p>

                <div className="pt-5 border-t border-slate-100/80 space-y-3.5 text-xs sm:text-sm text-[#0B2545]">
                  <div className="flex items-center gap-2.5">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-blue-600 shrink-0" />
                    <span>{FREE_SCAN_LIMIT} job match analyses each month</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-blue-600 shrink-0" />
                    <span>0–100 ATS compatibility rating</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-blue-600 shrink-0" />
                    <span>Missing keyword diagnostic report</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-blue-600 shrink-0" />
                    <span>Single-column ATS format preview</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#627D98]">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-blue-600 shrink-0" />
                    <span>Encrypted at rest, delete your data on request</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onScanClick}
                className="w-full py-4 px-5 rounded-xl border border-[#8DA9C4]/40 bg-gradient-to-b from-white/90 to-[#EEF4FB]/90 hover:from-[#EEF4FB] hover:to-[#E2ECF6] text-[#0B2545] font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,1)] hover:shadow-md cursor-pointer"
              >
                Start Free ({FREE_SCAN_LIMIT} Scans / Month)
              </button>
            </div>

            {/* ----------------- PRO CARD (HIGHLY PROMINENT WITH TRANSLUCENT NAVY GLASS & 3D SHADOW) ----------------- */}
            <div className="p-8 sm:p-9 rounded-3xl bg-[#0B2545]/90 backdrop-blur-2xl text-white border-2 border-[#1D4ED8] shadow-[0_24px_70px_rgba(11,37,69,0.45),0_10px_30px_rgba(29,78,216,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] relative overflow-hidden ring-4 ring-[#1D4ED8]/25 hover:shadow-[0_32px_80px_rgba(29,78,216,0.45)] hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between space-y-8">
              {/* Luminous Ambient Radial Glow */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#1D4ED8]/35 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8DA9C4] uppercase tracking-wider">
                    ResumeSetu Pro
                  </span>
                  <span className="text-[11px] font-bold text-white bg-[#1D4ED8] px-3.5 py-1 rounded-full shadow-md tracking-wide">
                    RECOMMENDED
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-white">₹{PRO_PRICE_INR}</span>
                  <span className="text-xs text-[#8DA9C4]">/ month</span>
                </div>

                <p className="text-xs sm:text-sm text-[#8DA9C4] leading-relaxed">
                  Tailor every application with unlimited AI audits, STAR rewrites, and cover letters until you accept your next offer.
                </p>

                <div className="pt-5 border-t border-white/10 space-y-3.5 text-xs sm:text-sm text-white">
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="w-5 h-5 rounded-full bg-[#1D4ED8] flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span>Unlimited ATS resume scans & job matches</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="w-5 h-5 rounded-full bg-[#1D4ED8] flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span>Deep Semantic Gap Finder & keyword injection</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#1D4ED8] flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span>AI-Tailored Resume with Google STAR formulas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#1D4ED8] flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span>Role-aligned custom Cover Letter generator</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#1D4ED8] flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span>Interactive Application Tracker & pipeline metrics</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#1D4ED8] flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                    <span>Single-column editable Word (.docx) export</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#8DA9C4]">
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#8DA9C4]" />
                    </span>
                    <span>Cancel anytime in 1 click · Zero lock-in</span>
                  </div>
                </div>
              </div>

              {/* Primary Action Button in Electric Blue Gradient */}
              <div className="relative z-10 pt-2">
                <button
                  type="button"
                  onClick={onOpenPaywall}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#38BDF8] hover:from-[#1E40AF] hover:via-[#1D4ED8] hover:to-[#2563EB] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_12px_28px_-4px_rgba(29,78,216,0.65),inset_0_1px_0_rgba(255,255,255,0.4)] cursor-pointer active:translate-y-0.5 flex items-center justify-center gap-2.5"
                >
                  <span>Upgrade to Pro — ₹{PRO_PRICE_INR}/mo</span>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </span>
                </button>
                <p className="text-[11px] text-[#8DA9C4] text-center mt-3 font-medium">
                  Under ₹9/day · Instant access across all roles
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. FAQ ACCORDION
         ========================================================================= */}
      <section className="py-20 sm:py-28 border-b border-[#8DA9C4]/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B2545] tracking-tight">
              Frequently Answered Questions
            </h2>
            <p className="mt-2 text-sm text-[#334E68]">
              Everything you need to know about our semantic parsing, formatting, and privacy guarantees.
            </p>
          </div>

          <div className="space-y-3.5">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/45 backdrop-blur-2xl border border-white/70 overflow-hidden shadow-[0_4px_16px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-md transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  aria-expanded={openFaq === idx}
                  aria-controls={`faq-panel-${idx}`}
                  className="w-full px-6 py-4.5 text-left flex items-center justify-between text-sm font-bold text-[#0B2545] hover:text-[#1D4ED8] transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 text-[#8DA9C4] transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-[#1D4ED8]' : ''
                    }`}
                  />
                </button>

                {openFaq === idx && (
                  <div
                    id={`faq-panel-${idx}`}
                    role="region"
                    aria-label={faq.question}
                    className="px-6 pb-5 text-xs sm:text-sm text-[#334E68] leading-relaxed border-t border-slate-100 pt-3.5"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. CORPORATE CLOUD MINIMALIST FOOTER WITH SINGLE COLOR BRANDING
         ========================================================================= */}
      <footer className="py-14 bg-[#0B2545] text-[#8DA9C4] border-t border-[#0B2545]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Logo variant="dark" size="md" />
            <span className="text-xs text-[#8DA9C4]/80 hidden sm:inline">
              · Precision ATS Screening & STAR Bullet Optimization
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#8DA9C4]">
            <button
              type="button"
              onClick={onOpenDeleteData}
              className="hover:text-white transition-colors cursor-pointer font-medium"
            >
              Purge Stored Data
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={onOpenPaywall}
              className="hover:text-white transition-colors cursor-pointer font-medium"
            >
              Pro Membership (₹{PRO_PRICE_INR}/mo)
            </button>
            <span>·</span>
            <span className="text-[#8DA9C4]/60">© 2026 ResumeSetu</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
