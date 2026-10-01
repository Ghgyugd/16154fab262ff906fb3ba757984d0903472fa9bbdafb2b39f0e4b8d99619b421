import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { LenisProvider } from './context/LenisContext.js';
import { Navbar } from './components/Navbar.js';
import { LandingPage } from './views/LandingPage.js';
import { Dashboard } from './views/Dashboard.js';
import { AdminPanel } from './views/AdminPanel.js';
import { PaywallModal } from './components/PaywallModal.js';
import { AuthModal } from './components/AuthModal.js';
import { DeleteDataModal } from './components/DeleteDataModal.js';
import { ATSInteractiveBackground } from './components/ATSInteractiveBackground.js';
import { SmoothScroll } from './components/SmoothScroll.js';

function MainApp() {
  const { user, firebaseUser, setAuthModalOpen } = useAuth();
  const [currentTab, setCurrentTab] = useState<'landing' | 'dashboard' | 'admin'>('landing');
  const [isPaywallOpen, setPaywallOpen] = useState(false);
  const [isDeleteDataOpen, setDeleteDataOpen] = useState(false);

  // Authenticated state is true if user signed in with Firebase or guest session active
  const isGuest = typeof window !== 'undefined' && localStorage.getItem('resumesetu_guest_session') === 'true';
  const hasAccess = !!firebaseUser || !!user || isGuest;

  // Sync hash and path routing if user clicks direct links or browser back/forward
  useEffect(() => {
    const handleRouting = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;

      if (
        hash === '#signin' ||
        hash === '#signup' ||
        hash === '#login' ||
        hash === '#auth' ||
        path === '/auth' ||
        path === '/login' ||
        path === '/sign-in' ||
        path === '/signup'
      ) {
        setAuthModalOpen(true);
      } else if (hash === '#admin' || path === '/admin') {
        setCurrentTab('admin');
      } else if (hash === '#dashboard' || hash === '#analyze') {
        if (hasAccess) {
          setCurrentTab('dashboard');
        } else {
          setCurrentTab('landing');
          setAuthModalOpen(true);
        }
      } else if (hash === '' || hash === '#') {
        setCurrentTab('landing');
      }
    };
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
    window.addEventListener('popstate', handleRouting);
    return () => {
      window.removeEventListener('hashchange', handleRouting);
      window.removeEventListener('popstate', handleRouting);
    };
  }, [hasAccess, setAuthModalOpen]);

  // When user successfully signs in, route to dashboard if requested
  useEffect(() => {
    if (hasAccess && (window.location.hash === '#dashboard' || window.location.hash === '#analyze')) {
      setCurrentTab('dashboard');
    }
  }, [hasAccess]);

  // Session Time Tracker Heartbeat
  useEffect(() => {
    const activeId = user?.id || (isGuest ? 'guest_user' : null);
    if (!activeId) return;

    // Ping once on mount / tab change
    fetch('/api/analytics/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: activeId, seconds: 15, page: currentTab }),
    }).catch(() => {});

    // Periodic heartbeat every 30s
    const pingInterval = setInterval(() => {
      fetch('/api/analytics/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeId, seconds: 30, page: currentTab }),
      }).catch(() => {});
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [user?.id, isGuest, currentTab]);

  const handleScanClick = () => {
    if (hasAccess) {
      setCurrentTab('dashboard');
      window.location.hash = 'dashboard';
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2F6FC] via-[#EBF2FA] to-[#EFF5FC] text-[#0B2545] flex flex-col font-['IBM_Plex_Sans'] antialiased selection:bg-[#1D4ED8] selection:text-white relative overflow-x-hidden max-w-full w-full">
      {/* Lenis Smooth Inertia Scroll Integration */}
      <SmoothScroll />

      {/* Blueprint Grid Canvas Texture */}
      <ATSInteractiveBackground />

      {/* Structured Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenPaywall={() => setPaywallOpen(true)}
        onOpenDeleteData={() => setDeleteDataOpen(true)}
        isSignedIn={hasAccess}
      />

      {/* Main View Container */}
      <main className="flex-1 relative z-10">
        {currentTab === 'landing' ? (
          <LandingPage
            onScanClick={handleScanClick}
            onOpenPaywall={() => setPaywallOpen(true)}
            onOpenDeleteData={() => setDeleteDataOpen(true)}
          />
        ) : currentTab === 'dashboard' ? (
          <Dashboard
            onOpenPaywall={() => setPaywallOpen(true)}
            onOpenDeleteData={() => setDeleteDataOpen(true)}
          />
        ) : (
          <AdminPanel
            onBackToWorkspace={() => {
              setCurrentTab('dashboard');
              window.location.hash = 'dashboard';
            }}
          />
        )}
      </main>

      {/* Global Modals */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setPaywallOpen(false)}
        onSuccess={() => {}}
      />
      <AuthModal
        onBypassSuccess={() => {
          setCurrentTab('dashboard');
          window.location.hash = 'dashboard';
        }}
      />
      <DeleteDataModal
        isOpen={isDeleteDataOpen}
        onClose={() => setDeleteDataOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <LenisProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </LenisProvider>
    </ThemeProvider>
  );
}

export default App;
