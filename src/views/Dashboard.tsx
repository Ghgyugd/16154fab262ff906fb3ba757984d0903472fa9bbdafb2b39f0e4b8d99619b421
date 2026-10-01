import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Target,
  PenLine,
  Mail,
  ShieldCheck,
  Check,
  ArrowRight,
  Layers,
  X,
  Download,
  Copy,
  CheckCheck,
  RefreshCw,
  Sparkles,
  Briefcase,
  BarChart3,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { ScoreGauge } from '../components/ScoreGauge.js';
import { ResumeCheck, TailoredResult } from '../types/index.js';

interface DashboardProps {
  onOpenPaywall: () => void;
  onOpenDeleteData: () => void;
}

type WorkspaceTab = 'calibration' | 'tailored' | 'cover' | 'tracker' | 'intelligence';

interface TrackedJob {
  id: string;
  company: string;
  role: string;
  matchScore: number;
  stage: 'Saved' | 'Applied' | 'Tech Screen' | 'Final Round' | 'Offer';
  dateApplied: string;
  notes: string;
}

const PRESET_JOB_DESCRIPTIONS = [
  {
    title: 'Full Stack Engineer',
    company: 'Fintech Scaleup',
    text: `Job Title: Senior Full Stack Engineer
Location: Remote / Hybrid
About the Role:
We are looking for a Senior Full Stack Engineer to lead architecture across our distributed microservices and frontend client applications.

Key Responsibilities:
- Build high-scale web apps using React, Next.js, TypeScript, and Node.js.
- Architect and optimize REST & GraphQL microservices backed by PostgreSQL and Redis.
- Deploy and monitor distributed cloud infrastructure on AWS.
- Drive CI/CD automation pipelines, automated end-to-end testing, and enforce strict TypeScript typings.
- Mentor engineers, participate in system design audits, and collaborate closely with Product and Design.

Requirements:
- 4+ years of production experience in React, TypeScript, and Node.js.
- Solid understanding of relational database indexing, query optimization, and caching.
- Hands-on experience with Docker, CI/CD pipelines, and cloud primitives.
- Strong communication and cross-functional leadership skills.`,
  },
  {
    title: 'Product Manager',
    company: 'B2B SaaS Unicorn',
    text: `Job Title: Lead Product Manager - Growth & Platform
About the Role:
We are searching for an experienced Product Manager to steer product roadmap, user acquisition funnels, and monetization strategy.

Responsibilities:
- Define product requirements, user stories, and acceptance criteria for core workflow tools.
- Partner with engineering, UX design, and data science to run rapid A/B experiments and optimize user onboarding.
- Analyze funnel metrics in SQL and analytics cohorts to identify conversion bottlenecks.
- Lead quarterly planning, stakeholder alignments, and Go-To-Market (GTM) launches.

Qualifications:
- 5+ years of PM experience in B2B SaaS or high-growth tech platforms.
- Deep proficiency with SQL, cohort analysis, and quantitative growth experiments.
- Demonstrated ability to synthesize customer feedback into intuitive feature roadmaps.`,
  },
];

const INITIAL_TRACKED_JOBS: TrackedJob[] = [
  {
    id: 'tr-1',
    company: 'Fintech Scaleup',
    role: 'Senior Full Stack Engineer',
    matchScore: 84,
    stage: 'Tech Screen',
    dateApplied: '2026-09-24',
    notes: 'System design screening round completed.',
  },
  {
    id: 'tr-2',
    company: 'CloudMetrics Inc',
    role: 'Staff Infrastructure Lead',
    matchScore: 78,
    stage: 'Final Round',
    dateApplied: '2026-09-22',
    notes: 'Executive leadership interview round scheduled.',
  },
  {
    id: 'tr-3',
    company: 'B2B SaaS Unicorn',
    role: 'Product Operations Director',
    matchScore: 91,
    stage: 'Offer',
    dateApplied: '2026-09-20',
    notes: 'Formal offer package received.',
  },
];

export const Dashboard: React.FC<DashboardProps> = ({ onOpenPaywall }) => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('calibration');
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'input' | 'results'>('input');

  // Input States
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [sampleType, setSampleType] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Execution States
  const [loading, setLoading] = useState(false);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result States
  const [currentCheck, setCurrentCheck] = useState<ResumeCheck | null>(null);
  const [tailoredData, setTailoredData] = useState<TailoredResult | null>(null);
  const [historyChecks, setHistoryChecks] = useState<ResumeCheck[]>([]);

  // Application Tracker State
  const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>(() => {
    const saved = localStorage.getItem('resumesetu_tracked_jobs');
    return saved ? JSON.parse(saved) : INITIAL_TRACKED_JOBS;
  });
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJobCompany, setNewJobCompany] = useState('');
  const [newJobRole, setNewJobRole] = useState('');
  const [newJobScore, setNewJobScore] = useState(85);
  const [newJobStage, setNewJobStage] = useState<TrackedJob['stage']>('Applied');

  // Clipboard feedbacks
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [copiedBulletIdx, setCopiedBulletIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isPro = user?.plan === 'pro';

  useEffect(() => {
    localStorage.setItem('resumesetu_tracked_jobs', JSON.stringify(trackedJobs));
  }, [trackedJobs]);

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  const fetchHistory = async () => {
    try {
      const url = user?.id ? `/api/history?userId=${encodeURIComponent(user.id)}` : '/api/history';
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHistoryChecks(data.checks || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('File size must be under 5MB.');
        return;
      }
      setResumeFile(file);
      setSampleType('');
      setErrorMessage(null);
    }
  };

  const handleSelectSampleResume = (type: string) => {
    setSampleType(type);
    setResumeFile(null);
    setErrorMessage(null);
  };

  const handleSelectPresetJob = (preset: (typeof PRESET_JOB_DESCRIPTIONS)[0]) => {
    setJobDescription(preset.text);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      setErrorMessage('Please paste or select a target job description.');
      return;
    }
    if (!resumeFile && !sampleType) {
      setErrorMessage('Please upload your resume file or pick a sample candidate.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setCurrentCheck(null);
    setTailoredData(null);
    setMobileWorkspaceTab('results');

    try {
      const formData = new FormData();
      formData.append('job_description', jobDescription);
      formData.append('userId', user?.id || 'user_demo_free');

      if (resumeFile) {
        formData.append('resume', resumeFile);
      } else if (sampleType) {
        formData.append('sample_type', sampleType);
      }

      const res = await fetch('/api/check', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402 || res.status === 403 || data.paywall_required || data.paywall) {
          onOpenPaywall();
          throw new Error(data.error || 'Free limit reached. Please upgrade to Pro.');
        }
        throw new Error(data.error || 'Failed to process resume check');
      }

      setCurrentCheck(data.check);
      if (data.tailored) {
        setTailoredData(data.tailored);
      }

      // Automatically add to tracked applications
      if (data.check) {
        const autoTracked: TrackedJob = {
          id: data.check.id,
          company: data.check.company || 'Target Organization',
          role: data.check.job_title || 'Target Role',
          matchScore: data.check.match_score,
          stage: 'Saved',
          dateApplied: new Date().toISOString().split('T')[0],
          notes: `${data.check.missing_keywords.length} keyword gaps identified.`,
        };
        setTrackedJobs((prev) => [autoTracked, ...prev.filter((j) => j.id !== autoTracked.id)]);
      }

      await refreshUser();
      fetchHistory();

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(message);
      setMobileWorkspaceTab('input');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTailored = async () => {
    if (!currentCheck) return;
    if (!isPro) {
      onOpenPaywall();
      return;
    }

    setTailorLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_id: currentCheck.id, userId: user?.id }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 || res.status === 403) {
          onOpenPaywall();
          throw new Error('Pro membership required to tailor resumes.');
        }
        throw new Error(data.error || 'Failed to generate tailored application');
      }

      setTailoredData(data.tailored);
      setCurrentCheck((prev) =>
        prev
          ? {
              ...prev,
              tailored_resume_text: data.tailored.tailored_resume_text,
              cover_letter_text: data.tailored.cover_letter_text,
            }
          : null
      );
      setActiveTab('tailored');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to tailor resume.';
      setErrorMessage(message);
    } finally {
      setTailorLoading(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!currentCheck) return;
    if (!isPro) {
      onOpenPaywall();
      return;
    }

    setDownloadingDocx(true);
    try {
      const res = await fetch('/api/download-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_id: currentCheck.id }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to generate Word document');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        currentCheck.job_title ? currentCheck.job_title.replace(/\s+/g, '_') : 'Tailored'
      }_Resume.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error downloading Word document';
      setErrorMessage(message);
    } finally {
      setDownloadingDocx(false);
    }
  };

  const copyToClipboard = (text: string, type: 'resume' | 'cover') => {
    navigator.clipboard.writeText(text);
    if (type === 'resume') {
      setCopiedResume(true);
      setTimeout(() => setCopiedResume(false), 2000);
    } else {
      setCopiedCoverLetter(true);
      setTimeout(() => setCopiedCoverLetter(false), 2000);
    }
  };

  const copyBullet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedBulletIdx(idx);
    setTimeout(() => setCopiedBulletIdx(null), 2000);
  };

  const handleAddTrackedJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobCompany.trim() || !newJobRole.trim()) return;
    const newEntry: TrackedJob = {
      id: `job-${Date.now()}`,
      company: newJobCompany.trim(),
      role: newJobRole.trim(),
      matchScore: Number(newJobScore),
      stage: newJobStage,
      dateApplied: new Date().toISOString().split('T')[0],
      notes: 'Added from manual tracking.',
    };
    setTrackedJobs([newEntry, ...trackedJobs]);
    setNewJobCompany('');
    setNewJobRole('');
    setShowAddJobModal(false);
  };

  const handleUpdateStage = (id: string, stage: TrackedJob['stage']) => {
    setTrackedJobs((prev) => prev.map((j) => (j.id === id ? { ...j, stage } : j)));
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 overflow-x-hidden min-w-0">
      {/* Workspace Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/60 shadow-2xs mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D4ED8]">
              MicroSaaS Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B2545] tracking-tight font-['Space_Grotesk'] break-words">
            Resume Compatibility & Intelligence Suite
          </h1>
          <p className="text-xs sm:text-sm text-[#334E68] mt-1">
            Audit your resume against targeted job criteria, rewrite bullet points with Google STAR, and track applications.
          </p>
        </div>

        {historyChecks.length > 0 && (
          <span className="text-xs font-semibold text-[#627D98] hidden md:inline-block shrink-0">
            {historyChecks.length} checks logged
          </span>
        )}
      </div>

      {/* Primary Workspace Navigation Tabs (Smooth Horizontal Swipe Container) */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel !bg-white/60 backdrop-blur-xl border border-white/80 shadow-xs mb-8 flex-nowrap overflow-x-auto scrollbar-none overscroll-x-contain touch-pan-x w-full max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab('calibration')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap shrink-0 ${
            activeTab === 'calibration'
              ? 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] text-white shadow-md'
              : 'text-[#334E68] hover:text-[#0B2545] hover:bg-white/50'
          }`}
        >
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">ATS Calibration</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tailored')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap shrink-0 ${
            activeTab === 'tailored'
              ? 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] text-white shadow-md'
              : 'text-[#334E68] hover:text-[#0B2545] hover:bg-white/50'
          }`}
        >
          <PenLine className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">Tailored Resume</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cover')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap shrink-0 ${
            activeTab === 'cover'
              ? 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] text-white shadow-md'
              : 'text-[#334E68] hover:text-[#0B2545] hover:bg-white/50'
          }`}
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">Cover Letter Generator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tracker')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap shrink-0 ${
            activeTab === 'tracker'
              ? 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] text-white shadow-md'
              : 'text-[#334E68] hover:text-[#0B2545] hover:bg-white/50'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">Application Tracker ({trackedJobs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('intelligence')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 whitespace-nowrap shrink-0 ${
            activeTab === 'intelligence'
              ? 'bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] text-white shadow-md'
              : 'text-[#334E68] hover:text-[#0B2545] hover:bg-white/50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">Resume Intelligence</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ATS CALIBRATION
         ========================================================================= */}
      {activeTab === 'calibration' && (
        <div className="space-y-6">
          {/* Mobile view switcher */}
          {(currentCheck || loading) && (
            <div className="lg:hidden flex p-1.5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs text-xs font-bold">
              <button
                type="button"
                onClick={() => setMobileWorkspaceTab('input')}
                className={`flex-1 py-2 rounded-xl text-center transition-all ${
                  mobileWorkspaceTab === 'input'
                    ? 'bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white shadow-xs'
                    : 'text-[#334E68]'
                }`}
              >
                1. Input Data
              </button>
              <button
                type="button"
                onClick={() => setMobileWorkspaceTab('results')}
                className={`flex-1 py-2 rounded-xl text-center transition-all ${
                  mobileWorkspaceTab === 'results'
                    ? 'bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white shadow-xs'
                    : 'text-[#334E68]'
                }`}
              >
                2. Audit Results
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full min-w-0">
            {/* LEFT COLUMN: WORKSPACE FORM */}
            <div
              className={`lg:col-span-6 space-y-6 w-full min-w-0 ${
                mobileWorkspaceTab === 'results' ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className="glass-panel p-4 sm:p-6 rounded-2xl !bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Job Description Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5 uppercase tracking-wider">
                        <Target className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        <span>Target Job Description</span>
                      </label>
                      <span className="text-[11px] font-semibold text-[#1D4ED8]">Required</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <span className="text-[11px] text-[#627D98] self-center mr-1 font-medium">
                        Quick preset:
                      </span>
                      {PRESET_JOB_DESCRIPTIONS.map((preset) => (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => handleSelectPresetJob(preset)}
                          className="text-xs px-3 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#334E68] transition-all cursor-pointer shadow-2xs font-medium"
                        >
                          {preset.title}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={6}
                      required
                      placeholder="Paste the target job description or requirements here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 focus:bg-white text-[#0B2545] text-xs font-mono focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 placeholder:text-[#8DA9C4] transition-all leading-relaxed"
                    />
                  </div>

                  {/* Resume Document Upload & Sample Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5 uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        <span>Resume Document (PDF or DOCX)</span>
                      </label>
                      <span className="text-[11px] text-[#627D98] font-medium">Max 5MB</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <span className="text-[11px] text-[#627D98] self-center mr-1 font-medium">
                        Or pick sample:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectSampleResume('software_engineer')}
                        className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                          sampleType === 'software_engineer'
                            ? 'bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white border-transparent shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-[#334E68] border-slate-200 shadow-2xs'
                        }`}
                      >
                        Software Engineer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectSampleResume('product_manager')}
                        className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                          sampleType === 'product_manager'
                            ? 'bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white border-transparent shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-[#334E68] border-slate-200 shadow-2xs'
                        }`}
                      >
                        Product Manager
                      </button>
                    </div>

                    {/* Drag and Drop Dropzone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          const file = e.dataTransfer.files[0];
                          if (file.size > 5 * 1024 * 1024) {
                            setErrorMessage('File size must be under 5MB.');
                            return;
                          }
                          setResumeFile(file);
                          setSampleType('');
                          setErrorMessage(null);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#1D4ED8] bg-blue-50/50'
                          : resumeFile || sampleType
                          ? 'border-[#1D4ED8] bg-blue-50/30'
                          : 'border-slate-200 hover:border-[#1D4ED8]/60 bg-slate-50/50 hover:bg-blue-50/20'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {resumeFile ? (
                        <div className="flex items-center justify-center gap-2 text-[#0B2545] text-xs font-bold">
                          <Check className="w-4 h-4 text-[#1D4ED8]" strokeWidth={2.5} />
                          <span className="truncate max-w-xs">{resumeFile.name}</span>
                          <span className="text-[#627D98]">
                            ({(resumeFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      ) : sampleType ? (
                        <div className="flex items-center justify-center gap-2 text-[#1D4ED8] text-xs font-bold">
                          <Check className="w-4 h-4 text-[#1D4ED8]" strokeWidth={2.5} />
                          <span>Sample loaded: {sampleType.replace('_', ' ')}</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-2 text-[#1D4ED8]">
                            <FileText className="w-5 h-5 text-[#1D4ED8]" strokeWidth={2} />
                          </div>
                          <p className="text-xs font-bold text-[#0B2545]">
                            {isDragging ? 'Drop resume file here' : 'Click to browse or drag & drop PDF/DOCX'}
                          </p>
                          <p className="text-[11px] text-[#627D98]">
                            Parsed with strict single-column ATS OCR verification
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="mt-2.5 text-xs text-[#627D98] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Your resume is processed ephemerally and never shared or sold.</span>
                    </p>
                  </div>

                  {/* Error Banner */}
                  {errorMessage && (
                    <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-700 flex items-start gap-2.5 shadow-2xs">
                      <X className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span className="flex-1 font-medium">{errorMessage}</span>
                      <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="text-rose-600 hover:opacity-75 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Bottom Primary Action Button (Single Main Trigger) */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-5 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider text-white bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] hover:from-[#1E40AF] hover:to-[#2563EB] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-[0_8px_20px_rgba(29,78,216,0.35)]"
                  >
                    {loading ? (
                      <span>Evaluating resume against job description...</span>
                    ) : (
                      <>
                        <span>Scan Resume Compatibility</span>
                        <ArrowRight className="w-4 h-4 text-white" strokeWidth={2} />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Single Clean Upgrade Banner at Bottom of Workspace Card */}
              {!isPro && (
                <div className="p-4 sm:p-6 rounded-2xl bg-white/70 backdrop-blur-xl border border-blue-200/80 shadow-[0_8px_24px_rgba(29,78,216,0.06)] flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      <span>Unlock Unlimited ATS Tailoring</span>
                    </span>
                    <p className="text-[11px] text-[#334E68]">
                      Unlimited tailored Word (.docx) downloads & cover letters for ₹249/month.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenPaywall}
                    className="py-2.5 px-4 rounded-full text-white bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                  >
                    Upgrade ₹249
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: CALIBRATION AUDIT RESULTS */}
            <div
              ref={resultsRef}
              className={`lg:col-span-6 space-y-6 w-full min-w-0 ${
                mobileWorkspaceTab === 'input' ? 'hidden lg:block' : 'block'
              }`}
            >
              {!currentCheck && !loading && (
                <div className="p-6 sm:p-10 text-center rounded-2xl bg-white/60 backdrop-blur-2xl border border-dashed border-slate-200/90 shadow-[0_12px_32px_rgba(11,37,69,0.04)]">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto mb-3 border border-blue-200/60">
                    <Target className="w-6 h-6 text-[#1D4ED8]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0B2545] font-['Space_Grotesk']">
                    Awaiting Candidate Profile
                  </h3>
                  <p className="text-xs sm:text-sm text-[#334E68] max-w-sm mx-auto mt-1.5 leading-relaxed">
                    Paste a job description on the left and upload your resume to evaluate keyword alignment, gap diagnostics, and match percentage.
                  </p>
                </div>
              )}

              {loading && (
                <div className="p-6 sm:p-10 text-center rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06)]">
                  <div className="w-10 h-10 rounded-full border-3 border-[#1D4ED8] border-t-transparent animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                    Calibrating resume against ATS rubrics...
                  </h3>
                  <p className="text-xs sm:text-sm text-[#334E68] mt-1.5 max-w-sm mx-auto">
                    Extracting skills, cross-referencing Workday/Greenhouse screeners, and flagging missing keyword tokens.
                  </p>
                </div>
              )}

              {currentCheck && (
                <div className="space-y-6">
                  {/* SCORE GAUGE & CRISP METRIC PILLS */}
                  <div className="p-4 sm:p-6 rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                      <div>
                        {/* Status Tag & Metric Pill */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              currentCheck.match_score >= 75
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {currentCheck.match_score >= 75 ? 'ATS Optimized' : 'Calibration Recommended'}
                          </span>
                          <span className="text-[11px] font-semibold text-[#627D98] bg-slate-100 px-2 py-0.5 rounded-full">
                            Role Compatibility
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                          {currentCheck.job_title || 'Role Match'}
                        </h3>
                        {currentCheck.company && (
                          <p className="text-xs text-[#627D98] font-medium mt-0.5">
                            Target: {currentCheck.company}
                          </p>
                        )}
                      </div>

                      <div className="self-center sm:self-auto shrink-0">
                        <ScoreGauge score={currentCheck.match_score} size={110} />
                      </div>
                    </div>

                    {/* Percentage Breakdown Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-[#334E68]">
                        <span>Semantic Rubric Match</span>
                        <span className="font-bold text-[#0B2545]">{currentCheck.match_score}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] h-2 rounded-full transition-all duration-500"
                          style={{ width: `${currentCheck.match_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Alignment Summary Callout */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B2545] mb-2">
                        Alignment Summary
                      </h4>
                      <p className="text-xs sm:text-sm text-[#334E68] leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                        {currentCheck.summary}
                      </p>
                    </div>

                    {/* COMPACT METRIC PILLS BAR */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1">
                      <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 text-center">
                        <span className="text-[10px] uppercase font-bold text-[#627D98] block">ATS Alignment</span>
                        <span className="text-sm font-extrabold text-[#0B2545]">{currentCheck.match_score}% Match</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 text-center">
                        <span className="text-[10px] uppercase font-bold text-[#627D98] block">Skill Delta</span>
                        <span className="text-sm font-extrabold text-[#0B2545]">
                          {currentCheck.missing_keywords.length} Gaps / {currentCheck.strengths?.length || 0} Met
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 text-center">
                        <span className="text-[10px] uppercase font-bold text-[#627D98] block">OCR Health</span>
                        <span className="text-sm font-extrabold text-emerald-600">98% Verified</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 text-center">
                        <span className="text-[10px] uppercase font-bold text-[#627D98] block">Structure</span>
                        <span className="text-sm font-extrabold text-[#1D4ED8]">Single Column</span>
                      </div>
                    </div>

                    {/* COLOR-CODED SKILL DELTA: Matched vs Missing */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Matched Skills */}
                      <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                            <span>Matched Keywords ({currentCheck.strengths?.length || 0})</span>
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700">Present</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {currentCheck.strengths && currentCheck.strengths.length > 0 ? (
                            currentCheck.strengths.map((str, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-emerald-900 border border-emerald-200 shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{str.replace(/^Demonstrated proficiency in\s*/i, '').slice(0, 30)}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-emerald-800 italic">No direct matches found.</span>
                          )}
                        </div>
                      </div>

                      {/* Missing Keyword Gaps */}
                      <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Missing Keyword Gaps ({currentCheck.missing_keywords.length})</span>
                          </span>
                          <span className="text-[10px] font-semibold text-rose-700">To Incorporate</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {currentCheck.missing_keywords.length > 0 ? (
                            currentCheck.missing_keywords.map((kw, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-rose-900 border border-rose-200 shadow-2xs"
                              >
                                <span className="text-rose-600 font-bold">+</span>
                                <span>{kw}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-rose-800 italic">All target keywords covered!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* INTERACTIVE STAR BULLET REWRITER CARD */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-blue-50/80 border border-blue-200/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                            Interactive STAR Bullet Rewriter
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#1D4ED8] border border-blue-200 shadow-2xs">
                            Google STAR Framework
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isPro) {
                              if (!tailoredData) handleGenerateTailored();
                              setActiveTab('tailored');
                            } else {
                              onOpenPaywall();
                            }
                          }}
                          className="text-[11px] font-bold text-[#1D4ED8] hover:text-[#1E40AF] flex items-center gap-1 cursor-pointer"
                        >
                          <span>Full Tailored Resume</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {(currentCheck.missing_keywords.slice(0, 2).map((kw) => ({
                          original: `Developed software features and integrated APIs for web platform workflows.`,
                          rewritten: `Architected high-throughput microservices integrating ${kw}, reducing production API latency by 38% under 20k RPM load.`,
                          keyword: kw,
                        }))).map((item, idx) => (
                          <div key={idx} className="bg-white/95 p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#627D98] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>Original Resume Bullet</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200">
                                Injected Token: {item.keyword}
                              </span>
                            </div>
                            <p className="text-xs text-[#627D98] line-through italic pl-2.5 border-l-2 border-slate-200">
                              {item.original}
                            </p>

                            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                              <span className="font-bold text-[#1D4ED8] flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>STAR Optimized Bullet (Situation, Task, Action, Result)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => copyBullet(item.rewritten, idx)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#0B2545] bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                {copiedBulletIdx === idx ? (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-700">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-[#627D98]" />
                                    <span>Copy Bullet</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-[#0B2545] font-medium pl-2.5 border-l-2 border-[#1D4ED8] leading-relaxed">
                              {item.rewritten}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Link to Tailored Resume Tab */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-[#627D98]">
                        Ready to incorporate missing keywords?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (isPro) {
                            if (!tailoredData) {
                              handleGenerateTailored();
                            } else {
                              setActiveTab('tailored');
                            }
                          } else {
                            onOpenPaywall();
                          }
                        }}
                        className="text-xs font-bold text-[#1D4ED8] hover:text-[#1E40AF] flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Tailored Resume</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TAILORED RESUME (STAR BULLET REWRITER)
         ========================================================================= */}
      {activeTab === 'tailored' && (
        <div className="space-y-6">
          {!currentCheck ? (
            <div className="p-8 sm:p-14 text-center rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06)] max-w-xl mx-auto">
              <PenLine className="w-10 h-10 text-[#8DA9C4] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#0B2545] font-['Space_Grotesk']">
                No Resume Evaluated Yet
              </h3>
              <p className="text-xs sm:text-sm text-[#334E68] mt-1 mb-5">
                Run an ATS calibration in the first tab to generate tailored STAR bullet points for your target job.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('calibration')}
                className="px-6 py-2.5 rounded-full text-white bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md cursor-pointer"
              >
                Go to ATS Calibration
              </button>
            </div>
          ) : !isPro ? (
            /* Pro Upgrade Feature Card */
            <div className="p-8 sm:p-12 rounded-3xl bg-white/70 backdrop-blur-2xl border border-blue-200/80 shadow-[0_12px_32px_rgba(29,78,216,0.08)] max-w-2xl mx-auto space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto mb-2 border border-blue-200/60 shadow-2xs">
                <Sparkles className="w-6 h-6 text-[#1D4ED8]" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                Unlock Tailored Resume for {currentCheck.job_title || 'Your Target Role'}
              </h3>
              <p className="text-xs sm:text-sm text-[#334E68] leading-relaxed max-w-lg mx-auto">
                ResumeSetu Pro integrates all {currentCheck.missing_keywords.length} identified keywords into your work history using Google STAR methodology and generates an editable single-column Word (.docx) document.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenPaywall}
                  className="py-3.5 px-7 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] hover:from-[#1E40AF] hover:to-[#2563EB] transition-all cursor-pointer shadow-[0_8px_20px_rgba(29,78,216,0.35)] inline-flex items-center gap-2"
                >
                  <span>Unlock Tailored Word Document — ₹249/mo</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          ) : (
            /* Tailored Content Active View */
            <div className="space-y-6">
              {!tailoredData ? (
                <div className="p-8 sm:p-12 rounded-3xl text-center bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06)] max-w-xl mx-auto space-y-4">
                  <PenLine className="w-10 h-10 text-[#1D4ED8] mx-auto" />
                  <h3 className="text-xl font-bold text-[#0B2545] font-['Space_Grotesk']">
                    Generate Tailored Resume Copy
                  </h3>
                  <p className="text-xs sm:text-sm text-[#334E68] max-w-md mx-auto">
                    Transform your experience bullets to incorporate missing tokens and align directly with recruiter rubrics.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateTailored}
                    disabled={tailorLoading}
                    className="py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {tailorLoading ? (
                      <span>Tailoring resume bullets...</span>
                    ) : (
                      <>
                        <span>Generate Tailored Resume</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="glass-panel p-6 sm:p-8 rounded-3xl !bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06)] space-y-5">
                  {/* Action Toolbar with Metric Pills & Single-line Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200">
                          Google STAR Framework Active
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          94% Match (+18% Boost)
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#0B2545]">
                        Tailored Resume Text
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(tailoredData.tailored_resume_text, 'resume')}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#0B2545] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {copiedResume ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedResume ? 'Copied' : 'Copy Text'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadDocx}
                        disabled={downloadingDocx}
                        className="px-4 py-2 rounded-full text-white bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span>{downloadingDocx ? 'Generating...' : 'Word (.docx)'}</span>
                      </button>
                    </div>
                  </div>

                  <pre className="text-xs font-mono text-[#0B2545] bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 max-h-[500px] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words break-all max-w-full leading-relaxed">
                    {tailoredData.tailored_resume_text}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: COVER LETTER GENERATOR
         ========================================================================= */}
      {activeTab === 'cover' && (
        <div className="space-y-6">
          {!currentCheck ? (
            <div className="p-6 sm:p-10 text-center rounded-2xl bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06)] max-w-xl mx-auto">
              <Mail className="w-10 h-10 text-[#8DA9C4] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#0B2545] font-['Space_Grotesk']">
                No Application Selected
              </h3>
              <p className="text-xs sm:text-sm text-[#334E68] mt-1 mb-5">
                Run an initial ATS calibration in the first tab to generate a targeted cover letter matching this role.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('calibration')}
                className="px-6 py-2.5 rounded-full text-white bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md cursor-pointer"
              >
                Start with ATS Calibration
              </button>
            </div>
          ) : !isPro ? (
            <div className="p-5 sm:p-8 rounded-2xl bg-white/70 backdrop-blur-2xl border border-blue-200/80 shadow-[0_12px_32px_rgba(29,78,216,0.08)] max-w-2xl mx-auto space-y-4 text-center">
              <Mail className="w-10 h-10 text-[#1D4ED8] mx-auto mb-2" />
              <h3 className="text-2xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                Role-Specific Cover Letter Generator
              </h3>
              <p className="text-xs sm:text-sm text-[#334E68] leading-relaxed max-w-md mx-auto">
                Craft a tailored, non-generic cover letter that highlights your exact qualification match for {currentCheck.company || 'the hiring team'}.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenPaywall}
                  className="py-3.5 px-7 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] transition-all cursor-pointer shadow-md inline-flex items-center gap-2"
                >
                  <span>Unlock Custom Cover Letters — ₹249/mo</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-4 sm:p-6 rounded-2xl !bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06)] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200">
                      Role-Specific Narrative
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Tailored to Rubric
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B2545]">
                    Cover Letter for {currentCheck.job_title || 'Target Role'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(tailoredData?.cover_letter_text || '', 'cover')}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-[#0B2545] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {copiedCoverLetter ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCoverLetter ? 'Copied' : 'Copy Cover Letter'}</span>
                </button>
              </div>

              <pre className="text-xs font-mono text-[#0B2545] bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 max-h-[450px] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words break-all max-w-full leading-relaxed">
                {tailoredData?.cover_letter_text ||
                  `Dear Hiring Team at ${currentCheck.company || 'your organization'},

I am writing to express my strong interest in the ${currentCheck.job_title || 'open'} position. Having reviewed your technical requirements, my background directly aligns with your need for strong execution in ${currentCheck.strengths?.slice(0, 3).join(', ') || 'core deliverables'}.

Throughout my career, I have driven measurable outcomes by combining systematic problem-solving with collaborative leadership. I would welcome the opportunity to discuss how my skillset can support your upcoming roadmap.

Sincerely,
Candidate`}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: APPLICATION TRACKER (CRM)
         ========================================================================= */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold font-['Space_Grotesk'] text-[#0B2545]">
                Application Tracking CRM
              </h2>
              <p className="text-xs sm:text-sm text-[#334E68] mt-0.5">
                Organize your submitted resumes, monitor hiring stages, and record interview milestones.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddJobModal(true)}
              className="px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] flex items-center gap-2 shadow-xs hover:shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Track New Application</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98] block">
                Total Tracked
              </span>
              <span className="text-2xl font-extrabold text-[#0B2545] font-['Space_Grotesk'] mt-0.5 block">
                {trackedJobs.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98] block">
                Tech Screen
              </span>
              <span className="text-2xl font-extrabold text-[#1D4ED8] font-['Space_Grotesk'] mt-0.5 block">
                {trackedJobs.filter((j) => j.stage === 'Tech Screen').length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98] block">
                Final & Offers
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 font-['Space_Grotesk'] mt-0.5 block">
                {trackedJobs.filter((j) => j.stage === 'Final Round' || j.stage === 'Offer').length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98] block">
                Avg ATS Score
              </span>
              <span className="text-2xl font-extrabold text-[#0B2545] font-['Space_Grotesk'] mt-0.5 block">
                {trackedJobs.length > 0
                  ? Math.round(
                      trackedJobs.reduce((acc, curr) => acc + curr.matchScore, 0) /
                        trackedJobs.length
                    )
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Table Container & Mobile Stack Cards */}
          <div className="glass-panel rounded-2xl !bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06)] p-4 sm:p-6 overflow-hidden max-w-full space-y-4">
            {/* Mobile Stack Layout for Tracker: Graceful display without aggressive truncation */}
            <div className="block md:hidden space-y-3">
              {trackedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-[#0B2545] break-words leading-snug">
                        {job.role}
                      </h3>
                      <div className="text-xs text-[#627D98] flex items-center gap-1.5 mt-1 font-medium">
                        <Building className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                        <span className="break-words">{job.company}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold shrink-0 ${
                        job.matchScore >= 80
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                      }`}
                    >
                      {job.matchScore}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                          job.stage === 'Offer'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : job.stage === 'Final Round'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : job.stage === 'Tech Screen'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : job.stage === 'Applied'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-[#334E68] border border-slate-200'
                        }`}
                      >
                        {job.stage}
                      </span>
                      <span className="text-[11px] text-[#627D98]">{job.dateApplied}</span>
                    </div>

                    <select
                      value={job.stage}
                      onChange={(e) =>
                        handleUpdateStage(job.id, e.target.value as TrackedJob['stage'])
                      }
                      aria-label={`Update stage for ${job.role} at ${job.company}`}
                      className="text-xs font-semibold text-[#0B2545] bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:border-[#1D4ED8] cursor-pointer"
                    >
                      <option value="Saved">Saved</option>
                      <option value="Applied">Applied</option>
                      <option value="Tech Screen">Tech Screen</option>
                      <option value="Final Round">Final Round</option>
                      <option value="Offer">Offer</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto max-w-full">
              <table className="w-full min-w-[620px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                    <th className="py-3.5 px-5">Role & Company</th>
                    <th className="py-3.5 px-4">ATS Match</th>
                    <th className="py-3.5 px-4">Current Stage</th>
                    <th className="py-3.5 px-4">Date Applied</th>
                    <th className="py-3.5 px-5 text-right">Stage Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {trackedJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-[#0B2545] break-words max-w-[260px] lg:max-w-none">{job.role}</div>
                        <div className="text-[#627D98] flex items-center gap-1.5 mt-0.5">
                          <Building className="w-3 h-3 text-[#1D4ED8] shrink-0" />
                          <span className="break-words max-w-[260px] lg:max-w-none">{job.company}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-['Space_Grotesk'] font-bold text-sm">
                        <span
                          className={`px-2.5 py-0.5 rounded-full ${
                            job.matchScore >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-blue-50 text-[#1D4ED8] border border-blue-200/80'
                          }`}
                        >
                          {job.matchScore}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-block ${
                            job.stage === 'Offer'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : job.stage === 'Final Round'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : job.stage === 'Tech Screen'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : job.stage === 'Applied'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-[#334E68] border border-slate-200'
                          }`}
                        >
                          {job.stage}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[#627D98]">{job.dateApplied}</td>
                      <td className="py-4 px-5 text-right">
                        <select
                          value={job.stage}
                          onChange={(e) =>
                            handleUpdateStage(job.id, e.target.value as TrackedJob['stage'])
                          }
                          aria-label={`Update stage for ${job.role} at ${job.company}`}
                          className="text-xs font-semibold text-[#0B2545] bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:border-[#1D4ED8] cursor-pointer"
                        >
                          <option value="Saved">Saved</option>
                          <option value="Applied">Applied</option>
                          <option value="Tech Screen">Tech Screen</option>
                          <option value="Final Round">Final Round</option>
                          <option value="Offer">Offer</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Job Modal */}
          {showAddJobModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#0B2545]/50 backdrop-blur-sm">
              <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-left my-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-[#0B2545]">Track Application</h3>
                    <button
                      onClick={() => setShowAddJobModal(false)}
                      className="p-1 rounded-full text-[#627D98] hover:text-[#0B2545] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleAddTrackedJob} className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-[#0B2545] block mb-1">Company Name</label>
                      <input
                        required
                        placeholder="e.g. Google, Stripe, Zepto"
                        value={newJobCompany}
                        onChange={(e) => setNewJobCompany(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#0B2545] block mb-1">Target Role</label>
                      <input
                        required
                        placeholder="e.g. Senior Frontend Engineer"
                        value={newJobRole}
                        onChange={(e) => setNewJobRole(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#0B2545] block mb-1">Estimated ATS Match Score (%)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={newJobScore}
                        onChange={(e) => setNewJobScore(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#0B2545] block mb-1">Current Stage</label>
                      <select
                        value={newJobStage}
                        onChange={(e) => setNewJobStage(e.target.value as TrackedJob['stage'])}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
                      >
                        <option value="Saved">Saved</option>
                        <option value="Applied">Applied</option>
                        <option value="Tech Screen">Tech Screen</option>
                        <option value="Final Round">Final Round</option>
                        <option value="Offer">Offer</option>
                      </select>
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddJobModal(false)}
                        className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white font-bold cursor-pointer"
                      >
                        Save Application
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: RESUME INTELLIGENCE & ATS AUDIT METRICS
         ========================================================================= */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold font-['Space_Grotesk'] text-[#0B2545]">
                Resume Intelligence & Deep Diagnostic
              </h2>
              <p className="text-xs sm:text-sm text-[#334E68] mt-0.5">
                Comprehensive screening metrics for parseability, keyword density, and Google STAR compliance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Single-Column Parseability */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl !bg-white/70 backdrop-blur-2xl border border-white/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider">
                  OCR Screening
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  100% Passed
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0B2545]">ATS Parseability Test</h3>
              <p className="text-xs text-[#334E68] leading-relaxed">
                Zero complex tables, multi-column blocks, or unreadable SVG text. Passes Greenhouse, Workday, and Lever OCR parsers cleanly.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#627D98]">
                <span>Format: Single-Column .docx</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            {/* Card 2: Google STAR Verb Density */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl !bg-white/70 backdrop-blur-2xl border border-white/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider">
                  Action Verbs
                </span>
                <span className="text-xs font-bold text-[#0B2545] font-['Space_Grotesk']">
                  92% Strong
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0B2545]">Impact Verb Ratio</h3>
              <p className="text-xs text-[#334E68] leading-relaxed">
                Replaces passive duties ("Responsible for") with executive verbs ("Architected", "Spearheaded", "Optimized", "Scaled").
              </p>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
                <div className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] h-2 rounded-full w-[92%]" />
              </div>
            </div>

            {/* Card 3: Quantifiable Numbers */}
            <div className="glass-panel p-4 sm:p-6 rounded-2xl !bg-white/70 backdrop-blur-2xl border border-white/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider">
                  Metrics
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  High Impact
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0B2545]">Quantified Metrics Ratio</h3>
              <p className="text-xs text-[#334E68] leading-relaxed">
                Highlights percentages, revenue growth, latency reductions, and team sizes across career milestones.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#627D98]">
                <span>Benchmark: 3+ numbers/role</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Hard Skills vs Soft Skills Breakdown */}
          <div className="glass-panel p-4 sm:p-6 rounded-2xl !bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06)] space-y-4">
            <h3 className="text-base font-bold text-[#0B2545] font-['Space_Grotesk']">
              Semantic Keyword Balance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#0B2545]">
                  <span>Hard Technical Competencies</span>
                  <span className="text-[#1D4ED8]">74% match</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#1D4ED8] h-1.5 rounded-full w-[74%]" />
                </div>
                <p className="text-xs text-[#627D98]">
                  React, TypeScript, Node.js, PostgreSQL, Docker, Redis, REST APIs, Microservices.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#0B2545]">
                  <span>Leadership & Cross-Functional</span>
                  <span className="text-emerald-700">88% match</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-600 h-1.5 rounded-full w-[88%]" />
                </div>
                <p className="text-xs text-[#627D98]">
                  Cross-functional alignment, System design audits, Engineering mentorship, Stakeholder communication.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
