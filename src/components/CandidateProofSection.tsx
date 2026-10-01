import React from 'react';
import { CheckCircle2, TrendingUp, Award, Building2 } from 'lucide-react';

interface CaseStudy {
  candidateName: string;
  previousRole: string;
  newRole: string;
  company: string;
  location: string;
  metric: string;
  metricLabel: string;
  quote: string;
  timeframe: string;
  beforeScore: number;
  afterScore: number;
}

const CASE_STUDIES: CaseStudy[] = [
  {
    candidateName: 'Aarav Patel',
    previousRole: 'Associate Software Engineer',
    newRole: 'Senior Full-Stack Engineer',
    company: 'Razorpay',
    location: 'Bengaluru',
    metric: '+46%',
    metricLabel: 'ATS Match Score Increase',
    quote:
      'My resume was getting rejected by Workday ATS within 12 hours. ResumeSetu highlighted 14 missing microservices and Redis keywords that I had experience with but omitted. Landed 3 final-round interviews in 2 weeks.',
    timeframe: 'Offer secured in 18 days',
    beforeScore: 48,
    afterScore: 94,
  },
  {
    candidateName: 'Sneha Deshmukh',
    previousRole: 'Marketing Specialist',
    newRole: 'Product Marketing Lead',
    company: 'Swiggy',
    location: 'Mumbai',
    metric: '4.2x',
    metricLabel: 'Recruiter Callback Rate',
    quote:
      'The STAR bullet rewrite transformed passive job descriptions into measurable metric outcomes. It generated a single-column clean docx that parsed with 100% accuracy on Greenhouse.',
    timeframe: 'Offer secured in 24 days',
    beforeScore: 52,
    afterScore: 96,
  },
  {
    candidateName: 'Rohan Iyer',
    previousRole: 'Data Analyst',
    newRole: 'Senior Analytics Manager',
    company: 'Freshworks',
    location: 'Chennai',
    metric: '3 Offers',
    metricLabel: 'From Top Tech Shortlists',
    quote:
      'Instead of spraying 100 generic resumes, I tailored each one in under 60 seconds. The cover letter generator matched the company hiring rubric accurately without sounding robotic.',
    timeframe: 'Offer secured in 21 days',
    beforeScore: 56,
    afterScore: 92,
  },
];

export const CandidateProofSection: React.FC = () => {
  return (
    <section id="proof" className="py-20 sm:py-28 border-b border-[#8DA9C4]/30 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1D4ED8] mb-2">
            <Award className="w-4 h-4" />
            <span>Verified Candidate Outgrowths</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B2545] tracking-tight">
            From ATS Black Hole to Recruiter Offer
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#334E68] leading-relaxed">
            Real outcomes from job seekers who aligned their experience with recruiter screening rubrics.
          </p>
        </div>

        {/* 3 Case Study Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {CASE_STUDIES.map((study, idx) => (
            <div
              key={idx}
              className="p-7 sm:p-8 rounded-3xl bg-white/55 backdrop-blur-xl border border-white/80 shadow-[0_12px_32px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,0.95)] hover:shadow-[0_20px_48px_rgba(29,78,216,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-5">
                {/* Metric Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#1D4ED8] font-mono tracking-tight block">
                      {study.metric}
                    </span>
                    <span className="text-xs font-semibold text-[#0B2545] uppercase tracking-wider mt-0.5 block">
                      {study.metricLabel}
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-xs font-mono">
                    <span className="text-rose-600 line-through">Score {study.beforeScore}%</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Score {study.afterScore}%
                    </span>
                  </div>
                </div>

                {/* Candidate Quote */}
                <p className="text-xs sm:text-sm text-[#334E68] leading-relaxed italic">
                  "{study.quote}"
                </p>
              </div>

              {/* Attribution Footer */}
              <div className="pt-5 border-t border-slate-100/80 mt-6 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0B2545]">{study.candidateName}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Offer
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#627D98]">
                  <span>{study.newRole}</span>
                  <span>·</span>
                  <span className="font-semibold text-[#0B2545] flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#1D4ED8]" />
                    {study.company}
                  </span>
                </div>

                <div className="text-[11px] text-[#8DA9C4] font-medium pt-1">
                  {study.timeframe} · {study.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
