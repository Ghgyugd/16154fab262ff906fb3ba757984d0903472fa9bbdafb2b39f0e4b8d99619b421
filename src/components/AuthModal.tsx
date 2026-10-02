import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SignIn, SignUp } from "@clerk/react";
import { LoaderCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { Logo } from "./Logo.js";

const clerkAppearance = {
  layout: {
    elevation: "flush" as const,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "#1D4ED8",
    colorPrimaryForeground: "#FFFFFF",
    colorBackground: "#FFFFFF",
    colorForeground: "#0B2545",
    colorMutedForeground: "#627D98",
    colorInput: "#F7F9FC",
    colorInputForeground: "#0B2545",
    colorBorder: "#CBD5E1",
    fontFamily: "IBM Plex Sans, sans-serif",
    fontFamilyButtons: "IBM Plex Sans, sans-serif",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full",
    card: "w-full max-w-none !bg-transparent !shadow-none !border-0 !p-0",
    header: "clerk-auth-hidden-header",
    footer: "clerk-auth-hidden-footer",
    footerItem: "clerk-auth-hidden-footer-item",
    footerAction: "clerk-auth-hidden-footer-action",
    footerPages: "clerk-auth-hidden-footer-pages",
    formFieldLabel: "text-xs font-semibold text-[#334E68]",
    formFieldInput:
      "min-h-11 !bg-[#F7F9FC] !border-[#CBD5E1] !text-[#0B2545] focus:!border-[#1D4ED8] focus:!ring-[#1D4ED8]/20",
    formButtonPrimary:
      "!bg-[#1D4ED8] hover:!bg-[#1E40AF] !font-semibold !shadow-none",
    socialButtonsBlockButton:
      "!min-h-11 !bg-white !border-[#CBD5E1] !text-[#0B2545] hover:!bg-[#F2F6FC] !shadow-none",
    dividerLine: "!bg-[#CBD5E1]",
    dividerText: "!text-[#627D98]",
    identityPreview: "!bg-[#F2F6FC] !border-[#CBD5E1]",
    formFieldAction: "!text-[#1D4ED8] hover:!text-[#1E40AF]",
    alert: "!border-red-200 !bg-red-50 !text-red-700",
  },
};

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    clerkUser,
    retryBackendSync,
    authError,
    loading,
  } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAuthModalOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isAuthModalOpen, setAuthModalOpen]);

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAuthModalOpen(false)}
            className="fixed inset-0 bg-[#0B2545]/65 backdrop-blur-md"
          />
          <div className="relative z-10 flex min-h-full items-center justify-center p-3 sm:p-5">
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-modal-title"
              tabIndex={-1}
              className="relative w-full max-w-[460px] rounded-xl border border-white bg-white p-4 text-[#0B2545] shadow-[0_24px_64px_rgba(11,37,69,0.22)] sm:p-6 focus:outline-none"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#8DA9C4]/25 pb-3">
                <Logo size="sm" />
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  className="rounded-md p-2 text-[#627D98] transition-colors hover:bg-slate-100 hover:text-[#0B2545]"
                  aria-label="Close sign-in dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2
                id="auth-modal-title"
                className="mb-4 font-['Space_Grotesk'] text-xl font-bold"
              >
                {authMode === "signup" ? "Create your account" : "Welcome back"}
              </h2>

              {authError && (
                <p
                  role="alert"
                  className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {authError}
                </p>
              )}

              {clerkUser ? (
                <div className="space-y-3">
                  <p className="text-sm text-[#334E68]">
                    Your sign-in succeeded, but ResumeSetu could not finish
                    connecting your account.
                  </p>
                  <button
                    type="button"
                    onClick={retryBackendSync}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    <span>
                      {loading ? "Connecting account…" : "Retry connection"}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="clerk-auth-theme">
                  {authMode === "signup" ? (
                    <SignUp
                      routing="hash"
                      signInUrl="/signin"
                      forceRedirectUrl="/#dashboard"
                      fallbackRedirectUrl="/#dashboard"
                      appearance={clerkAppearance}
                    />
                  ) : (
                    <SignIn
                      routing="hash"
                      signUpUrl="/signup"
                      forceRedirectUrl="/#dashboard"
                      fallbackRedirectUrl="/#dashboard"
                      appearance={clerkAppearance}
                    />
                  )}
                </div>
              )}

              {!clerkUser && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setAuthMode(authMode === "signup" ? "signin" : "signup")
                    }
                    className="mt-3 w-full text-center text-xs font-medium text-[#627D98] hover:text-[#1D4ED8]"
                  >
                    {authMode === "signup"
                      ? "Already have an account? Sign in"
                      : "New to ResumeSetu? Create an account"}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
