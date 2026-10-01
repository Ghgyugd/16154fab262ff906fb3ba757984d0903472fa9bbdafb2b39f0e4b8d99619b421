import React, { useState, useEffect } from 'react';
import {
  FileText,
  Target,
  ArrowRight,
  Check,
  Zap,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Eye,
  ShieldCheck,
} from 'lucide-react';

interface BridgeVisualHeroProps {
  onTryNow: () => void;
}

interface DemoRole {
  id: string;
  name: string;
  company: string;
  roleTitle: string;
  initialScore: number;
  finalScore: number;
  missingKeywords: string[];
  injectedKeywords: string[];
  uncalibratedBullets: {
    text: string;
    issue: string;
  }[];
  tailoredBullets: {
    text: string;
    metric: string;
    skill: string;
  }[];
  recruiterVerdict: {
    scanDuration: string;
    parserCompat: string;
    interviewLikelihood: string;
  };
}

const DEMO_ROLES: DemoRole[] = [
  {
    id: 'engineering',
    name: 'Full-Stack Engineer',
    company: 'Stripe',
    roleTitle: 'Senior Full Stack Infrastructure Engineer',
    initialScore: 46,
    finalScore: 96,
    missingKeywords: ['GraphQL Microservices', 'AWS Lambda', 'Idempotency', 'Distributed Caching', 'p99 Latency SLA'],
    injectedKeywords: ['GraphQL Microservices', 'AWS Lambda', 'Idempotency', 'Redis Caching', 'p99 Latency SLA'],
    uncalibratedBullets: [
      {
        text: 'Wrote frontend and backend code for internal payment checkout system using React and Node.',
        issue: 'Lacks quantifiable metric, business scale, or architectural scope',
      },
      {
        text: 'Helped database run faster and resolved application bugs found by the QA team.',
        issue: 'Passive verb "Helped"; missing specific database engine or throughput benchmarks',
      },
      {
        text: 'Worked with team engineers in daily agile standups and planned upcoming sprints.',
        issue: 'Generic duties without technical leadership or business outcome',
      },
    ],
    tailoredBullets: [
      {
        text: 'Architected high-throughput GraphQL microservices in Node.js and TypeScript, reducing p99 API response latency by 38% under strict 99.99% availability SLA.',
        metric: '38% p99 Latency Drop',
        skill: 'GraphQL & Node.js',
      },
      {
        text: 'Engineered idempotent payment processing pipeline using PostgreSQL and Redis distributed caching, securely settling over $14.2M in monthly transaction volume.',
        metric: '$14.2M Monthly Volume',
        skill: 'PostgreSQL & Idempotency',
      },
      {
        text: 'Automated CI/CD deployments on AWS ECS and Lambda with zero-downtime canary rollouts, accelerating developer release frequency from bi-weekly to 4x daily.',
        metric: '4x Daily Deployments',
        skill: 'AWS ECS & CI/CD',
      },
    ],
    recruiterVerdict: {
      scanDuration: '5.2 seconds',
      parserCompat: '100% Single-Column ATS',
      interviewLikelihood: 'Top 5% Candidate',
    },
  },
  {
    id: 'product',
    name: 'Product Manager',
    company: 'Linear',
    roleTitle: 'Staff Growth Product Manager',
    initialScore: 49,
    finalScore: 97,
    missingKeywords: ['Cohort Retention', 'B2B SaaS PLG', 'Amplitude Funnels', 'SQL Data Modeling', 'GTM Sprints'],
    injectedKeywords: ['Cohort Retention', 'PLG Activation', 'SQL Analysis', 'Amplitude Funnels', 'Enterprise GTM'],
    uncalibratedBullets: [
      {
        text: 'Managed onboarding flow improvements and collaborated with design on user sign-up drop-offs.',
        issue: 'Lacks funnel drop-off delta, activation percentage, or customer tier impact',
      },
      {
        text: 'Conducted customer research interviews and prioritized roadmap features for product team.',
        issue: 'Standard job description phrasing rather than attributable commercial results',
      },
      {
        text: 'Ran weekly sprint meetings and reported monthly KPIs to executive stakeholders.',
        issue: 'Missing retention cohorts, monetization gains, or enterprise expansion data',
      },
    ],
    tailoredBullets: [
      {
        text: 'Spearheaded self-serve PLG activation redesign using Amplitude behavioral cohorts, driving a 41% surge in Day-14 workspace retention across 18,000+ teams.',
        metric: '+41% Day-14 Retention',
        skill: 'PLG & Amplitude',
      },
      {
        text: 'Synthesized 65+ enterprise customer feedback sessions into an accelerated roadmap, unlocking $2.8M ARR expansion pipeline in Q3.',
        metric: '+$2.8M ARR Expansion',
        skill: 'Enterprise Roadmap',
      },
      {
        text: 'Authored SQL data models tracking cross-functional feature adoption, identifying pricing tier bottlenecks and lifting free-to-paid conversion by 23%.',
        metric: '+23% Free-to-Paid',
        skill: 'SQL Data Modeling',
      },
    ],
    recruiterVerdict: {
      scanDuration: '4.8 seconds',
      parserCompat: '100% Single-Column ATS',
      interviewLikelihood: 'Top 3% Candidate',
    },
  },
  {
    id: 'data',
    name: 'AI & Data Scientist',
    company: 'Datadog',
    roleTitle: 'Senior Machine Learning & RAG Engineer',
    initialScore: 44,
    finalScore: 95,
    missingKeywords: ['Vector Embeddings', 'Milvus / Qdrant', 'RAG Chunking', 'Latency Optimization', 'ROUGE Benchmarks'],
    injectedKeywords: ['Vector Indexing', 'Qdrant / pgvector', 'Hybrid RAG Search', 'GPU Quantization', 'Eval Benchmarks'],
    uncalibratedBullets: [
      {
        text: 'Built AI models using Python and PyTorch for search queries and customer questions.',
        issue: 'No retrieval precision score, embedding model, or inference latency benchmarks',
      },
      {
        text: 'Cleaned data sets and tested prompt engineering templates for company internal tools.',
        issue: 'Low-effort wording; missing grounding framework or hallucination rate',
      },
      {
        text: 'Deployed machine learning containers on cloud servers with docker.',
        issue: 'Vague claims without scale, orchestration, or cost reductions',
      },
    ],
    tailoredBullets: [
      {
        text: 'Architected hybrid vector retrieval pipeline combining BM25 with Qdrant embeddings, lifting Top-3 query recall from 64% to 92% across 4.5M telemetry logs.',
        metric: '92% Top-3 Recall',
        skill: 'Vector RAG & Qdrant',
      },
      {
        text: 'Optimized LLM inference with 4-bit AWQ quantization on Triton Server, slashing GPU memory consumption by 52% and inference latency to 24ms.',
        metric: '52% Cost Reduction',
        skill: 'Quantization & Triton',
      },
      {
        text: 'Established automated synthetic evaluation suite (Ragas), suppressing factual hallucination rate to <1.2% before enterprise customer deployment.',
        metric: '<1.2% Hallucination Rate',
        skill: 'Ragas Eval Suite',
      },
    ],
    recruiterVerdict: {
      scanDuration: '5.0 seconds',
      parserCompat: '100% Single-Column ATS',
      interviewLikelihood: 'Top 4% Candidate',
    },
  },
];

export const BridgeVisualHero: React.FC<BridgeVisualHeroProps> = ({ onTryNow }) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('engineering');
  const [activeView, setActiveView] = useState<'calibrated' | 'uncalibrated'>('calibrated');
  const [isScanning, setIsScanning] = useState(false);
  const [displayScore, setDisplayScore] = useState(96);

  const role = DEMO_ROLES.find((r) => r.id === selectedRoleId) || DEMO_ROLES[0];

  useEffect(() => {
    setDisplayScore(activeView === 'calibrated' ? role.finalScore : role.initialScore);
  }, [selectedRoleId, activeView, role]);

  const triggerCalibrationScan = () => {
    setIsScanning(true);
    setActiveView('calibrated');

    const duration = 900;
    const startTime = Date.now();
    const startScore = role.initialScore;
    const targetScore = role.finalScore;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      const currentScore = Math.round(
        startScore + (targetScore - startScore) * Math.sin((progress * Math.PI) / 2)
      );
      setDisplayScore(currentScore);

      if (progress >= 1) {
        clearInterval(interval);
        setIsScanning(false);
      }
    }, 25);
  };

  return (
    <div id="preview" className="w-full max-w-6xl mx-auto my-10 sm:my-14 px-4 sm:px-6 relative scroll-mt-24">
      {/* Outer Studio Container */}
      <div className="relative rounded-2xl bg-white border border-[#8DA9C4]/35 shadow-lg shadow-[#0B2545]/5 overflow-hidden">
        {/* Workspace Toolbar Header */}
        <div className="bg-[#F7F9FC] px-4 sm:px-6 py-3 border-b border-[#8DA9C4]/35 flex flex-wrap items-center justify-between gap-3">
          {/* Target Metadata */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-[#0B2545]">{role.company}</span>
            <span className="text-[#8DA9C4]">/</span>
            <span className="text-[#334E68] hidden sm:inline">{role.roleTitle}</span>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {DEMO_ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedRoleId === r.id
                    ? 'bg-[#0B2545] text-white shadow-xs font-semibold'
                    : 'text-[#334E68] hover:text-[#0B2545]'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Interactive Scan Action */}
          <button
            onClick={triggerCalibrationScan}
            disabled={isScanning}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1940B0] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
          >
            {isScanning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating Match...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-white" />
                <span>Run Interactive Audit</span>
              </>
            )}
          </button>
        </div>

        {/* Visual Inspection Workspace */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Top HUD: Score Radar + Recruiter Screening Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Visual Circular ATS Score Gauge */}
            <div className="md:col-span-4 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                  <span>ATS Match Rating</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    displayScore >= 80
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {displayScore >= 80 ? 'Interview Ready' : 'High Rejection Risk'}
                </span>
              </div>

              {/* Circular Meter */}
              <div className="my-4 flex items-center gap-5">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke={displayScore >= 80 ? '#059669' : '#E11D48'}
                      strokeWidth="3.5"
                      strokeDasharray={`${displayScore}, 100`}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                      {displayScore}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-900">
                    {displayScore >= 80 ? 'Shortlist Priority Tier' : 'Lacks Core Keywords'}
                  </p>
                  <p className="text-xs text-slate-500 leading-tight">
                    {displayScore >= 80
                      ? 'High semantic alignment with required technical responsibilities.'
                      : 'Missing 5 essential competencies sought by automated filters.'}
                  </p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-slate-200">
                <button
                  onClick={() => setActiveView('calibrated')}
                  className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeView === 'calibrated'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  STAR Format
                </button>
                <button
                  onClick={() => setActiveView('uncalibrated')}
                  className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeView === 'uncalibrated'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Raw Gaps
                </button>
              </div>
            </div>

            {/* Recruiter Screening Telemetry */}
            <div className="md:col-span-8 p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recruiter 6-Second Screen Simulation</span>
                </span>
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Single-Column Compatible</span>
                </span>
              </div>

              {/* Instant Telemetry Metrics */}
              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <p className="text-xs text-slate-500">Scan Duration</p>
                  <p className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5">
                    {role.recruiterVerdict.scanDuration}
                  </p>
                  <span className="text-[11px] text-emerald-600 font-medium">Clear Visual Hierarchy</span>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <p className="text-xs text-slate-500">Parser Compliance</p>
                  <p className="text-base sm:text-lg font-bold font-mono text-blue-600 mt-0.5">
                    0 Errors
                  </p>
                  <span className="text-[11px] text-slate-500">Linear Reading Stream</span>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <p className="text-xs text-slate-500">Recruiter Verdict</p>
                  <p className="text-base sm:text-lg font-bold font-mono text-emerald-700 mt-0.5">
                    {activeView === 'calibrated' ? role.recruiterVerdict.interviewLikelihood : 'Screened Out'}
                  </p>
                  <span className="text-[11px] text-slate-500">Automated Pipeline</span>
                </div>
              </div>

              {/* Keyword Diagnostic Strip */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700">
                    {activeView === 'calibrated' ? 'Calibrated & Injected Tokens' : 'Detected Missing Keywords'}
                  </span>
                  <span className="text-xs text-slate-500">5 Required Competencies</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(activeView === 'calibrated' ? role.injectedKeywords : role.missingKeywords).map((kw, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                        activeView === 'calibrated'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {activeView === 'calibrated' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>{kw}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Document Experience Showcase */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">
                {activeView === 'calibrated' ? 'Calibrated STAR Bullet Points' : 'Flagged Passive Phrasing'}
              </span>
              <span className="text-xs text-slate-500">Standard Single-Column Layout</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {activeView === 'calibrated'
                ? role.tailoredBullets.map((b, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-blue-600">
                            Bullet {i + 1}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {b.skill}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {b.text}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">Quantifiable Result:</span>
                        <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {b.metric}
                        </span>
                      </div>
                    </div>
                  ))
                : role.uncalibratedBullets.map((b, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-rose-50/40 border border-rose-200 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-rose-700">
                          Flagged Phrasing
                        </span>
                        <p className="text-xs text-slate-500 leading-relaxed line-through decoration-rose-400">
                          {b.text}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-rose-100 text-[11px] text-rose-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>{b.issue}</span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Bottom Conversion Prompt */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#8DA9C4]/30">
            <div className="flex items-center gap-3 text-xs text-[#627D98]">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero Hallucination Guarantee</span>
              </span>
              <span>·</span>
              <span>1-Click Word (.docx) & PDF Export</span>
            </div>

            <button
              onClick={onTryNow}
              className="pl-5 pr-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0B2545] hover:bg-[#113159] flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-98"
            >
              <span>Analyze Your Resume Free</span>
              <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                <ArrowRight className="w-3 h-3 text-white" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
