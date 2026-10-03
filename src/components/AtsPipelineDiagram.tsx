import React, { useState } from 'react';
import {
  FileText,
  Target,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Search,
  Check,
} from 'lucide-react';

interface Stage {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  tag: string;
  inputLabel: string;
  inputValue: string;
  outputLabel: string;
  outputValue: string;
  highlights: string[];
}

const STAGES: Stage[] = [
  {
    id: 'parse',
    step: '01',
    title: 'Resume Ingestion',
    subtitle: 'Extracts clean semantic tokens from messy multi-column PDFs',
    icon: FileText,
    tag: 'Document Normalizer',
    inputLabel: 'Raw Upload File',
    inputValue: 'Multi-column tables, graphic bars, or stylized PDF layouts',
    outputLabel: 'Structured Text Stream',
    outputValue: 'Single-column structured taxonomy: Experience, Skills, and Education',
    highlights: ['Bypasses parser-breaking columns', 'Normalizes unicode & phone anchors', 'Preserves chronological headers'],
  },
  {
    id: 'matrix',
    step: '02',
    title: 'Job Description Mapping',
    subtitle: 'Extracts hard technical prerequisites from lengthy job posts',
    icon: Search,
    tag: 'Semantic Mapping',
    inputLabel: 'Target Job Posting',
    inputValue: 'Greenhouse/Lever posting containing core responsibilities and soft requirements',
    outputLabel: 'Screening Rubric',
    outputValue: '12 Mandatory core tools, 4 experience benchmarks, and domain competencies',
    highlights: ['Separates mandatory vs optional', 'Weights senior architectural signals', 'Extracts exact recruiter search tokens'],
  },
  {
    id: 'radar',
    step: '03',
    title: 'Gap Delta Analysis',
    subtitle: 'Pins missing tokens and scores resume against recruiter rubrics',
    icon: Target,
    tag: '0–100 Alignment Score',
    inputLabel: 'Initial Alignment',
    inputValue: '46% Raw Match (High automated rejection probability)',
    outputLabel: 'Calibrated Target',
    outputValue: '96% ATS Cleared (Shortlist priority for hiring manager review)',
    highlights: ['5 Missing keywords flagged', 'Weak passive verbs highlighted', 'Calculates recruiter gaze hotspots'],
  },
  {
    id: 'compile',
    step: '04',
    title: 'Single-Column DOCX Export',
    subtitle: 'Rephrases authentic achievements into single-column Word files',
    icon: FileCheck,
    tag: 'Production File Export',
    inputLabel: 'Candidate Experience',
    inputValue: 'Your authentic career history, verified projects, and real metrics',
    outputLabel: 'Interview-Ready DOCX',
    outputValue: 'Single-column Microsoft Word (.docx) file and targeted cover letter',
    highlights: ['Zero invented falsities or roles', 'Google STAR bullet structure', 'Guaranteed parser readability'],
  },
];

export const AtsPipelineDiagram: React.FC = () => {
  const [activeStageId, setActiveStageId] = useState<string>('radar');
  const activeStage = STAGES.find((s) => s.id === activeStageId) || STAGES[2];

  return (
    <section id="pipeline" className="py-16 sm:py-24 border-b border-[#8DA9C4]/30 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8] mb-2">
            Automated Workflow
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0B2545] tracking-tight">
            How The ATS Engine Processes Your Application
          </h2>
          <p className="mt-2 text-base text-[#334E68]">
            A deterministic pipeline moving your resume from initial ingestion to verified shortlist priority.
          </p>
        </div>

        {/* 4 Stage Interactive Selector Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = stage.id === activeStageId;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStageId(stage.id)}
                className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer backdrop-blur-xl ${
                  isActive
                    ? 'bg-white/80 border-[#1D4ED8] shadow-[0_8px_20px_rgba(29,78,216,0.15)] ring-2 ring-[#1D4ED8]/20'
                    : 'bg-white/40 border-white/70 hover:border-[#8DA9C4] hover:bg-white/70 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-bold ${isActive ? 'text-[#1D4ED8]' : 'text-[#627D98]'}`}>
                    {stage.step}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isActive ? 'bg-[#1D4ED8]/10 text-[#1D4ED8]' : 'bg-[#F0F4F8] text-[#334E68]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-semibold text-[#0B2545]">
                  {stage.title}
                </h3>
                <p className="text-xs text-[#627D98] mt-1 line-clamp-2 leading-relaxed">
                  {stage.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Stage Inspection Detail Panel with High Transparency Glassmorphism */}
        <div className="rounded-3xl bg-white/45 backdrop-blur-2xl border border-white/70 p-6 sm:p-8 shadow-[0_20px_50px_-10px_rgba(11,37,69,0.12),inset_0_1px_0_rgba(255,255,255,0.95)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold text-[#1D4ED8]">
                Step {activeStage.step} · {activeStage.tag}
              </span>
              <h3 className="text-xl font-bold text-[#0B2545] mt-0.5">
                {activeStage.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#334E68] mt-0.5">
                {activeStage.subtitle}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Verified Single-Column Layout</span>
            </div>
          </div>

          {/* Transformation Flow: Input -> Output */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 my-6 items-center">
            {/* Input Box */}
            <div className="md:col-span-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block">
                Input Format
              </span>
              <p className="text-xs font-semibold text-slate-900">
                {activeStage.inputLabel}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeStage.inputValue}
              </p>
            </div>

            {/* Connecting Visual Arrow */}
            <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs">
                <ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1.5 font-medium">
                Calibrated
              </span>
            </div>

            {/* Output Box */}
            <div className="md:col-span-5 p-4 rounded-xl bg-blue-50/40 border border-blue-200 space-y-1.5">
              <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wide block">
                Output Deliverable
              </span>
              <p className="text-xs font-semibold text-slate-900">
                {activeStage.outputLabel}
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeStage.outputValue}
              </p>
            </div>
          </div>

          {/* Key Stage Verifications */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500">Stage verifications:</span>
            <div className="flex flex-wrap items-center gap-2">
              {activeStage.highlights.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200"
                >
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>{h}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
