import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react';
import { FREE_SCAN_LIMIT, PRO_UNLIMITED_CREDITS, remainingScansFor } from '../config.js';
import { User } from '../types/index.js';

export interface AuthIdentity {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  clerkUser: AuthIdentity | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authMode: 'signin' | 'signup';
  setAuthMode: (mode: 'signin' | 'signup') => void;
  retryBackendSync: () => void;
  logout: () => Promise<void>;
  cancelSubscription: () => Promise<boolean>;
  deleteMyData: () => Promise<boolean>;
  authError: string | null;
  clearAuthError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(record: any, identity?: AuthIdentity | null): User {
  const plan: 'free' | 'pro' = record?.currentPlan?.toUpperCase() === 'PRO' ? 'pro' : 'free';
  const id = record?.id || identity?.uid || 'guest_unknown';
  return {
    id,
    email: record?.email || identity?.email || `${id}@guest.resumesetu.app`,
    displayName: record?.displayName || identity?.displayName || (id.startsWith('guest_') ? 'Guest Candidate' : null),
    photoURL: identity?.photoURL || null,
    plan,
    credits_remaining: plan === 'pro'
      ? PRO_UNLIMITED_CREDITS
      : Math.max(0, FREE_SCAN_LIMIT - (record?.monthlyScansUsed || 0)),
    isAnonymous: id.startsWith('guest_'),
    isAdmin: Boolean(record?.isAdmin),
    role: record?.role || (record?.isAdmin ? 'ADMIN' : 'USER'),
    created_at: record?.createdAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const { user: clerkResource, isLoaded: userLoaded } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const lastSyncedIdentity = useRef<string | null>(null);
  const [syncAttempt, setSyncAttempt] = useState(0);

  const clerkUser: AuthIdentity | null = clerkResource
    ? {
        uid: clerkResource.id,
        email: clerkResource.primaryEmailAddress?.emailAddress || null,
        displayName: clerkResource.fullName,
        photoURL: clerkResource.imageUrl || null,
      }
    : null;

  const syncWithBackend = async (token: string, identity: AuthIdentity, guestToken?: string | null) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ guestToken: guestToken || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.user) {
      throw new Error(data.error || 'Could not sync your account. Please try again.');
    }
    return toAppUser(data.user, identity);
  };

  useEffect(() => {
    if (!isLoaded || !userLoaded) return;

    if (!isSignedIn || !clerkUser) {
      lastSyncedIdentity.current = null;
      setUser(null);
      setAuthError(null);
      setLoading(false);
      return;
    }

    if (lastSyncedIdentity.current === clerkUser.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Your Clerk session could not be verified. Please sign in again.');
        const guestToken = localStorage.getItem('resumesetu_guest_uid');
        const syncedUser = await syncWithBackend(token, clerkUser, guestToken);
        if (cancelled) return;
        setUser(syncedUser);
        lastSyncedIdentity.current = clerkUser.uid;
        localStorage.removeItem('resumesetu_guest_session');
        localStorage.removeItem('resumesetu_guest_uid');
        setAuthError(null);
        setAuthModalOpen(false);
        window.location.hash = 'dashboard';
      } catch (err) {
        if (!cancelled) {
          setUser(null);
          setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
          setAuthMode('signin');
          setAuthModalOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userLoaded, isSignedIn, clerkUser?.uid, getToken, syncAttempt]);

  const retryBackendSync = () => {
    lastSyncedIdentity.current = null;
    setAuthError(null);
    setLoading(true);
    setSyncAttempt((attempt) => attempt + 1);
  };

  const refreshUser = async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    if (data.user) setUser(toAppUser(data.user, clerkUser));
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (isSignedIn) await signOut().catch(() => {});
    localStorage.removeItem('resumesetu_guest_uid');
    localStorage.removeItem('resumesetu_active_user');
    setUser(null);
    setAuthModalOpen(false);
    lastSyncedIdentity.current = null;
    window.location.hash = '';
  };

  const cancelSubscription = async (): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const res = await fetch('/api/auth/cancel-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setAuthError(body?.error || `Cancellation failed (HTTP ${res.status}).`);
        return false;
      }
      setUser((prev) => prev
        ? { ...prev, plan: 'free', credits_remaining: remainingScansFor('free', prev.credits_remaining) }
        : null);
      return true;
    } catch {
      setAuthError('Could not reach the server to cancel your plan.');
      return false;
    }
  };

  const deleteMyData = async (): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const res = await fetch('/api/auth/delete-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        await logout();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const clearAuthError = useCallback(() => setAuthError(null), []);
  return (
    <AuthContext.Provider value={{
      user,
      clerkUser,
      loading,
      isAuthModalOpen,
      setAuthModalOpen,
      authMode,
      setAuthMode,
      retryBackendSync,
      logout,
      cancelSubscription,
      deleteMyData,
      refreshUser,
      authError,
      clearAuthError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
