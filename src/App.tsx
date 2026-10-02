import React, { useState, useEffect } from 'react';
import { AuthenticateWithRedirectCallback, ClerkProvider } from '@clerk/react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LenisProvider } from './context/LenisContext.js';
import { Navbar } from './components/Navbar.js';
import { LandingPage } from './views/LandingPage.js';
import { Dashboard } from './views/Dashboard.js';
import { AdminPanel } from './views/AdminPanel.js';
import { PaywallModal } from './components/PaywallModal.js';
import { AuthModal } from './components/AuthModal.js';
import { DeleteDataModal } from './components/DeleteDataModal.js';
import { ATSInteractiveBackground } from './components/ATSInteractiveBackground.js';

type Tab = 'landing' | 'dashboard' | 'admin';

function MainApp() {
  const { user, clerkUser, loading, setAuthModalOpen, setAuthMode } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>('landing');
  const [isPaywallOpen, setPaywallOpen] = useState(false);
  const [isDeleteDataOpen, setDeleteDataOpen] = useState(false);

  const hasAccess = Boolean(
    clerkUser && user && !user.isAnonymous && !user.id.startsWith('guest_')
  );
  const routingReady = !loading;

  // Sync hash and path routing if user clicks direct links or browser back/forward
  useEffect(() => {
    if (!routingReady) return;
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
        setAuthMode(hash === '#signup' || path === '/signup' ? 'signup' : 'signin');
        setAuthModalOpen(true);
      } else if (hash === '#admin' || path === '/admin') {
        if (hasAccess && user?.isAdmin) {
          setCurrentTab('admin');
        } else {
          setCurrentTab('landing');
          if (!hasAccess) setAuthModalOpen(true);
        }
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
  }, [routingReady, hasAccess, user?.isAdmin, setAuthModalOpen, setAuthMode]);

  // When user successfully signs in, route to dashboard if requested
  useEffect(() => {
    if (routingReady && hasAccess && (window.location.hash === '#dashboard' || window.location.hash === '#analyze')) {
      setCurrentTab('dashboard');
    }
  }, [routingReady, hasAccess]);

  // Session Time Tracker Heartbeat
  useEffect(() => {
    const activeId = hasAccess ? user?.id : null;
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
  }, [user?.id, hasAccess, currentTab]);

  const handleScanClick = () => {
    if (!routingReady) return;
    if (hasAccess) {
      setCurrentTab('dashboard');
      window.location.hash = 'dashboard';
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F2F6FC] via-[#EBF2FA] to-[#EFF5FC] text-[#0B2545] flex flex-col font-['IBM_Plex_Sans'] antialiased selection:bg-[#1D4ED8] selection:text-white relative overflow-x-hidden max-w-full w-full">
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
        {currentTab === 'landing' && (
          <LandingPage
            onScanClick={handleScanClick}
            onOpenPaywall={() => setPaywallOpen(true)}
            onOpenDeleteData={() => setDeleteDataOpen(true)}
          />
        )}
        {currentTab === 'dashboard' && hasAccess && (
          <Dashboard
            onOpenPaywall={() => setPaywallOpen(true)}
            onOpenDeleteData={() => setDeleteDataOpen(true)}
          />
        )}
        {currentTab === 'admin' && hasAccess && user?.isAdmin && (
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
      />
      <AuthModal />
      <DeleteDataModal
        isOpen={isDeleteDataOpen}
        onClose={() => setDeleteDataOpen(false)}
      />
    </div>
  );
}

export function App() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 text-center font-['IBM_Plex_Sans'] text-[#0B2545]">
        Clerk is not configured. Set VITE_CLERK_PUBLISHABLE_KEY to start the application.
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {window.location.pathname === '/sso-callback' ? (
        <div className="min-h-screen grid place-items-center bg-gradient-to-b from-[#F2F6FC] via-[#EBF2FA] to-[#EFF5FC] font-['IBM_Plex_Sans'] text-[#0B2545]">
          <AuthenticateWithRedirectCallback />
        </div>
      ) : (
        <LenisProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </LenisProvider>
      )}
    </ClerkProvider>
  );
}

export default App;
