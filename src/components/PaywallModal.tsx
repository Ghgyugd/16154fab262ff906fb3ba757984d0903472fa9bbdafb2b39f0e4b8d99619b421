import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X, ArrowRight, ShieldCheck, Sparkles, Send, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Upgrade to ResumeSetu Pro',
  subtitle = 'Get unlimited ATS-compliant single-column Word documents plus targeted cover letters.',
}) => {
  const { user, firebaseUser, upgradeToPro } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [instantSuccess, setInstantSuccess] = useState(false);

  const candidateEmail = firebaseUser?.email || user?.email || 'madara.the.darkest@gmail.com';
  const candidateId = firebaseUser?.uid || user?.id || 'usr-candidate-1';

  const telegramMessage = `Hello Admin, I would like to activate ResumeSetu Pro (₹249/month) for my account.%0A%0ARegistered Email: ${encodeURIComponent(
    candidateEmail
  )}%0ACandidate UID: ${encodeURIComponent(candidateId)}%0APlan: ₹249 / Month Unlimited Scans`;

  const telegramUrl = `https://t.me/ResumeSetuAdmin?text=${telegramMessage}`;

  const handleInstantActivate = async () => {
    setProcessing(true);
    try {
      await upgradeToPro();
      setInstantSuccess(true);
      setTimeout(() => {
        setProcessing(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0B2545]/60 backdrop-blur-md"
          />

          {/* Centering Wrapper to avoid flexbox clipping */}
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl overflow-hidden z-10 my-auto p-5 sm:p-8 flex flex-col bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_24px_64px_rgba(11,37,69,0.22)] text-left"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl text-[#627D98] hover:text-[#0B2545] hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span className="text-[11px] font-bold text-[#1D4ED8] uppercase tracking-wider">
                    ResumeSetu Pro Membership
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B2545] tracking-tight mt-1">
                  {title}
                </h3>

                <p className="text-xs sm:text-sm text-[#334E68] mt-1.5 leading-relaxed">
                  {subtitle}
                </p>

                {/* Price card */}
                <div className="my-5 p-4 rounded-2xl border border-blue-200/80 bg-blue-50/50 flex items-baseline justify-between shadow-2xs">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold font-['Space_Grotesk'] text-[#0B2545]">₹249</span>
                      <span className="text-xs text-[#627D98] font-medium">/ month</span>
                    </div>
                    <span className="text-[11px] text-[#627D98] font-medium">Less than ₹9/day · Unlimited scans & exports</span>
                  </div>
                  <span className="text-xs font-bold text-[#1D4ED8] bg-white border border-blue-200/70 px-3 py-1 rounded-full shadow-2xs">
                    Cancel anytime
                  </span>
                </div>

                {/* Feature Checklist */}
                <div className="space-y-3 mb-6 text-xs sm:text-sm text-[#0B2545]">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Unlimited match-score evaluations</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Full tailored resume with Google STAR metrics</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Downloadable Microsoft Word (.docx) files</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Custom cover letters aligned to each job description</span>
                  </div>
                </div>

                {/* Manual Telegram Payment Action */}
                <div className="space-y-3">
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] hover:from-[#1E40AF] hover:to-[#2563EB] shadow-[0_8px_20px_rgba(29,78,216,0.35)] transition-all flex items-center justify-center gap-2 text-center no-underline cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-white" />
                    <span>Contact Admin on Telegram to Activate Pro</span>
                  </a>

                  {/* Immediate 1-Click Instant Activation For Sandbox / Evaluation */}
                  <button
                    type="button"
                    onClick={handleInstantActivate}
                    disabled={processing || instantSuccess}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-[#0B2545] bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {instantSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        <span className="text-emerald-700">Pro Membership Activated!</span>
                      </>
                    ) : processing ? (
                      <span>Activating Pro status...</span>
                    ) : (
                      <span>Instant 1-Click Test Activation (Sandbox)</span>
                    )}
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-[#627D98] text-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                  <span>Direct admin activation · Account synced with {candidateEmail}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
