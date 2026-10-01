import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowRight,
  Check,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Logo } from './Logo.js';

interface AuthModalProps {
  onBypassSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onBypassSuccess }) => {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    continueAsGuest,
  } = useAuth();

  const [internalMode, setInternalMode] = useState<'signin' | 'signup'>(authMode || 'signin');
  const [email, setEmail] = useState('madara.the.darkest@gmail.com');
  const [password, setPassword] = useState('Candidate2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const activeMode = internalMode;

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
      if (onBypassSuccess) onBypassSuccess();
    } catch (err: any) {
      console.error('Google auth error:', err);
      setErrorMessage(err?.message || 'Authentication error.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsLoading(true);
      await continueAsGuest();
      if (onBypassSuccess) onBypassSuccess();
    } catch (err: any) {
      console.error('Guest access error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid candidate email address.');
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (activeMode === 'signin') {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
      if (onBypassSuccess) onBypassSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
        {/* Landing Page Deep Navy Backdrop with Soft Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => setAuthModalOpen(false)}
          className="fixed inset-0 bg-[#0B2545]/65 backdrop-blur-md"
        />

        {/* Flex Centering with min-h-full to prevent top/bottom clipping overflow bug */}
        <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
          {/* Modal Card Matching 100% Landing Page Design Language */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] rounded-2xl sm:rounded-3xl z-10 p-4 sm:p-6 flex flex-col bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_24px_64px_rgba(11,37,69,0.22),inset_0_1px_0_rgba(255,255,255,1)] text-[#0B2545] text-left my-auto overflow-hidden"
          >
            {/* Subtle blueprint grid texture from landing page */}
            <div className="absolute inset-0 bg-[radial-gradient(#1D4ED8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none rounded-2xl sm:rounded-3xl" />

            {/* Top Bar: Branded Logo, Skip Pill & Close Button */}
            <div className="relative w-full flex items-center justify-between pb-2.5 mb-2 sm:pb-3 sm:mb-2.5 border-b border-[#8DA9C4]/25">
              <Logo size="sm" />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold text-[#1D4ED8] bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  title="Bypass auth & test with 3 free scans"
                >
                  <span>Skip</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  className="p-1 rounded-full text-[#627D98] hover:text-[#0B2545] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Branded Header with Landing Page Cursive + Gradient Headline */}
            <div className="relative w-full text-left mb-2.5 sm:mb-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-cursive text-base sm:text-lg text-[#1D4ED8] -rotate-1 font-bold select-none tracking-wide">
                  From raw draft to recruiter shortlist
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold font-['Space_Grotesk'] text-[#0B2545] tracking-tight leading-tight">
                Bridge to your{' '}
                <span className="bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#60A5FA] bg-clip-text text-transparent">
                  ATS Workspace
                </span>
              </h2>

              <p className="text-[11px] sm:text-xs text-[#334E68] mt-1 leading-snug">
                {activeMode === 'signin'
                  ? 'Sign in to unlock ATS compatibility calibration, keyword gap detection, and Word export.'
                  : 'Create your account for 3 free ATS scans per month with single-column .docx export.'}
              </p>
            </div>

            {/* Segmented Mode Switcher: Sign In vs Create Account */}
            <div className="relative w-full p-1 bg-slate-100/90 rounded-xl border border-[#8DA9C4]/30 flex mb-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setInternalMode('signin');
                  setAuthMode('signin');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                  activeMode === 'signin'
                    ? 'bg-white text-[#0B2545] shadow-[0_2px_8px_rgba(11,37,69,0.08)]'
                    : 'text-[#627D98] hover:text-[#0B2545]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setInternalMode('signup');
                  setAuthMode('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center whitespace-nowrap ${
                  activeMode === 'signup'
                    ? 'bg-white text-[#0B2545] shadow-[0_2px_8px_rgba(11,37,69,0.08)]'
                    : 'text-[#627D98] hover:text-[#0B2545]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message Alert (if any) */}
            {errorMessage && (
              <div className="relative w-full mb-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2 text-rose-800 text-xs text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Sleek Single "Continue with Google" Action - No overflow */}
            <div className="relative w-full space-y-2">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-3 px-3 sm:px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-[#0B2545] hover:text-[#1D4ED8] bg-gradient-to-b from-white to-[#F0F4F8] hover:from-[#F0F4F8] hover:to-white border border-[#8DA9C4]/40 shadow-[0_4px_14px_rgba(11,37,69,0.06),inset_0_1px_0_rgba(255,255,255,1)] hover:shadow-[0_8px_20px_rgba(11,37,69,0.12)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-60 min-w-0"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 text-[#1D4ED8] animate-spin shrink-0" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span className="truncate font-bold text-xs tracking-wider">
                  Continue with Google
                </span>
              </button>

              {/* Candidate account label */}
              <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] text-[#627D98] text-center">
                <span>Account:</span>
                <span className="font-mono font-medium text-[#1D4ED8] truncate max-w-[210px] sm:max-w-none">
                  madara.the.darkest@gmail.com
                </span>
              </div>

              {/* Divider with subtle typography */}
              <div className="relative flex items-center justify-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#8DA9C4]/30" />
                </div>
                <div className="relative px-2 bg-white text-[10px] font-bold text-[#8DA9C4] uppercase tracking-wider text-center">
                  or with candidate email
                </div>
              </div>

              {/* 2. Custom Themed Email Form */}
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#334E68] mb-1 text-left">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA9C4]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      className="w-full pl-9 pr-3 py-2 text-xs text-[#0B2545] rounded-xl border border-[#8DA9C4]/40 bg-[#F0F4F8]/70 focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 transition-all outline-none placeholder-[#8DA9C4]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#334E68] text-left">
                      Password
                    </label>
                    {activeMode === 'signin' && (
                      <span className="text-[10px] text-[#627D98] font-medium">
                        Demo password prefilled
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8DA9C4]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={activeMode === 'signin' ? '••••••••' : 'Min 6 characters'}
                      className="w-full pl-9 pr-9 py-2 text-xs text-[#0B2545] rounded-xl border border-[#8DA9C4]/40 bg-[#F0F4F8]/70 focus:bg-white focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20 transition-all outline-none placeholder-[#8DA9C4]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8DA9C4] hover:text-[#0B2545] p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Primary Submit Button Styled to Landing Page 3D Rich Gradient */}
                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full mt-1.5 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] hover:from-[#1E40AF] hover:via-[#1D4ED8] hover:to-[#2563EB] shadow-[0_8px_20px_rgba(29,78,216,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_12px_28px_rgba(29,78,216,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{activeMode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 3. Prominent "Skip for now & Continue as Guest" Action */}
            <div className="relative w-full mt-2.5 pt-2.5 border-t border-[#8DA9C4]/25 flex flex-col items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider text-[#0B2545] bg-gradient-to-b from-[#F0F4F8] to-[#E2E8F0] hover:from-[#E2E8F0] hover:to-[#F0F4F8] border border-[#8DA9C4]/35 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-60"
              >
                <span>Skip for now & Continue as Guest</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#1D4ED8] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] text-[#627D98] text-center leading-tight">
                <span className="inline-flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                  3 Free Scans
                </span>
                <span className="text-slate-300">·</span>
                <span>Single-column DOCX</span>
                <span className="text-slate-300">·</span>
                <span>No Card Required</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
