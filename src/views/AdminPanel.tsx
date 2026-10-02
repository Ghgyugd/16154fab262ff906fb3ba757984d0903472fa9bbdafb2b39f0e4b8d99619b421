import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  CreditCard,
  FileText,
  Activity,
  Zap,
  Search,
  RefreshCw,
  Plus,
  ArrowLeft,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  DollarSign,
  Clock,
  Sliders,
  ShieldAlert,
  Trash2,
  Edit3,
  Server,
  Database,
  Key,
  Ban,
  UserCheck,
  BarChart3,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { hasAdminPrivileges, isOwnerEmail, FREE_SCAN_LIMIT, PRO_PRICE_INR } from '../config.js';

interface AdminUser {
  id: string;
  email: string;
  displayName?: string | null;
  authProviderId: string | null;
  currentPlan: 'FREE' | 'PRO';
  monthlyScansUsed: number;
  creditResetDate: string;
  isAdmin?: boolean;
  role?: 'OWNER' | 'ADMIN' | 'USER';
  isBanned?: boolean;
  banReason?: string;
  totalTimeSpentSeconds?: number;
  lastActiveAt?: string;
  createdAt: string;
}

interface LLMConfig {
  id: string;
  name: string;
  provider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'custom';
  modelId: string;
  apiKeyEnv?: string;
  contextWindow: string;
  latencyTier: 'sub-second' | 'standard' | 'deep-reasoning';
  enabled: boolean;
  createdAt: string;
}

interface TaskBinding {
  task: 'score' | 'tailor' | 'cover_letter' | 'star_bullet' | 'resume_parse';
  taskLabel: string;
  primaryModelId: string;
  fallbackModelId: string;
}

interface SystemSettings {
  promptInjectionShield: boolean;
  maxUploadSizeMb: number;
  freeTierMonthlyLimit: number;
  proPriceInr: number;
  rateLimitWindowDays: number;
  maintenanceMode: boolean;
  allowedFileExtensions: string[];
}

interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  severity: 'info' | 'warning' | 'critical';
  details: string;
  ip?: string;
  actorEmail?: string;
  targetUserId?: string;
}

interface SystemHealth {
  status: string;
  uptime: string;
  uptimeSeconds: number;
  nodeVersion: string;
  platform: string;
  memoryRssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  pid: number;
  services: Array<{ name: string; status: string; latencyMs: number }>;
}

interface AdminStats {
  totalUsers: number;
  activeProMembers: number;
  freeMembers: number;
  bannedUsers: number;
  adminUsers: number;
  proAdoptionRate: number;
  totalDocumentsParsed: number;
  totalScansPerformed: number;
  totalApplicationsTracked: number;
  avgAtsScore: number;
  totalTimeSpentSeconds: number;
  avgSessionDurationMinutes: number;
  scansByRole: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  llmMetrics: {
    groqTokens: number;
    geminiTokens: number;
    totalTokens: number;
    estimatedCostUsd: string;
  };
}

interface AdminPanelProps {
  onBackToWorkspace: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToWorkspace }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'users' | 'llms' | 'security' | 'monitoring' | 'settings'
  >('analytics');

  // Core Data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [llms, setLlms] = useState<LLMConfig[]>([]);
  const [bindings, setBindings] = useState<Record<string, TaskBinding>>({});
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | 'pro' | 'free' | 'admin' | 'banned'>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  // Per-endpoint failure reason, so a missing panel can say why it is empty
  // instead of showing invented values.
  const [endpointErrors, setEndpointErrors] = useState<Record<string, string>>({});

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editFormData, setEditFormData] = useState<{
    displayName: string;
    currentPlan: 'FREE' | 'PRO';
    role: 'OWNER' | 'ADMIN' | 'USER';
    monthlyScansUsed: number;
    isBanned: boolean;
    banReason: string;
  }>({
    displayName: '',
    currentPlan: 'FREE',
    role: 'USER',
    monthlyScansUsed: 0,
    isBanned: false,
    banReason: '',
  });

  // Add LLM Modal
  const [showAddLLMModal, setShowAddLLMModal] = useState(false);
  const [newLLMData, setNewLLMData] = useState<{
    name: string;
    provider: 'groq' | 'gemini' | 'openai' | 'anthropic' | 'custom';
    modelId: string;
    contextWindow: string;
    latencyTier: 'sub-second' | 'standard' | 'deep-reasoning';
    apiKeyEnv: string;
  }>({
    name: '',
    provider: 'groq',
    modelId: '',
    contextWindow: '128k',
    latencyTier: 'standard',
    apiKeyEnv: 'API_KEY',
  });

  // Privileges are decided by the server from the signed session cookie, never
  // from client-supplied headers or an email string comparison.
  const isOwnerOrAdmin = hasAdminPrivileges(user);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Authorization travels in the httpOnly session cookie the browser already
  // sends. Sending identity headers (previously defaulting to the owner) made
  // the admin API trivially spoofable.
  const getAuthHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
  });

  const fetchAdminData = async () => {
    if (!isOwnerOrAdmin) return;
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      // Settled, not all-or-nothing: one failing endpoint must not leave the whole
      // panel silently half-populated with no user-visible explanation.
      const endpoints = [
        { key: 'stats', url: '/api/admin/stats', pick: (d: any) => d.stats, apply: setStats },
        { key: 'users', url: '/api/admin/users', pick: (d: any) => d.users || [], apply: setUsers },
        { key: 'llms', url: '/api/admin/llms', pick: (d: any) => d.llms || [], apply: setLlms },
        { key: 'bindings', url: '/api/admin/llm-bindings', pick: (d: any) => d.bindings || {}, apply: setBindings },
        { key: 'settings', url: '/api/admin/settings', pick: (d: any) => d.settings, apply: setSettings },
        { key: 'health', url: '/api/admin/system-health', pick: (d: any) => d.health, apply: setHealth },
        { key: 'logs', url: '/api/admin/security-logs', pick: (d: any) => d.logs || [], apply: setSecurityLogs },
      ] as const;

      const results = await Promise.allSettled(
        endpoints.map(async (ep) => {
          const res = await fetch(ep.url, { headers });
          if (!res.ok) throw new Error(`${ep.key}: HTTP ${res.status}`);
          return (await res.json()) as any;
        })
      );

      const failures: string[] = [];
      const reasons: Record<string, string> = {};
      results.forEach((result, i) => {
        const ep = endpoints[i];
        if (result.status === 'fulfilled') {
          ep.apply(result.value ? ep.pick(result.value) : undefined as any);
        } else {
          failures.push(ep.key);
          reasons[ep.key] =
            result.reason instanceof Error ? result.reason.message : 'Request failed';
        }
      });

      setLoadErrors(failures);
      setEndpointErrors(reasons);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      setLoadErrors(['admin data']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwnerOrAdmin) {
      fetchAdminData();
    }
  }, [isOwnerOrAdmin, user]);

  // Periodic health ping
  useEffect(() => {
    if (!isOwnerOrAdmin) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/system-health', { headers: getAuthHeaders() });
        if (res.ok) {
          const d = await res.json();
          setHealth(d.health);
          setEndpointErrors((prev) => {
            if (!prev.health) return prev;
            const { health: _dropped, ...rest } = prev;
            return rest;
          });
        } else {
          // Drop the reading rather than leaving stale numbers on screen that
          // look like a live, healthy system.
          setHealth(null);
          setEndpointErrors((prev) => ({
            ...prev,
            health: `HTTP ${res.status}`,
          }));
        }
      } catch (err) {
        setHealth(null);
        setEndpointErrors((prev) => ({
          ...prev,
          health: err instanceof Error ? err.message : 'Request failed',
        }));
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isOwnerOrAdmin]);

  // ==========================================
  // USER ACTIONS
  // ==========================================

  const handleTogglePro = async (targetUserId: string) => {
    setActionLoading(`pro-${targetUserId}`);
    try {
      const res = await fetch('/api/admin/toggle-pro', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, currentPlan: data.user.currentPlan } : u))
        );
        showToast(`Plan updated for ${data.user.email} -> ${data.user.currentPlan}`);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = async (targetUserId: string, currentIsAdmin: boolean) => {
    setActionLoading(`admin-${targetUserId}`);
    try {
      const res = await fetch('/api/admin/toggle-admin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: targetUserId, isAdmin: !currentIsAdmin }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isAdmin: data.user.isAdmin, role: data.user.role } : u))
        );
        showToast(`User ${data.user.email} is now ${data.user.isAdmin ? 'an Administrator' : 'a Candidate'}`);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBan = async (targetUserId: string, currentlyBanned: boolean) => {
    setActionLoading(`ban-${targetUserId}`);
    const reason = !currentlyBanned
      ? prompt('Enter suspension / ban reason:', 'Automated security policy flag') || 'Policy violation'
      : '';
    try {
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: targetUserId, isBanned: !currentlyBanned, banReason: reason }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, isBanned: data.user.isBanned, banReason: data.user.banReason } : u))
        );
        showToast(data.user.isBanned ? `User ${data.user.email} suspended.` : `User ${data.user.email} reinstated.`);
        fetchAdminData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update ban status');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddCredits = async (targetUserId: string, count: number = 3) => {
    setActionLoading(`credits-${targetUserId}`);
    try {
      const res = await fetch('/api/admin/add-credits', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: targetUserId, credits: count }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, monthlyScansUsed: data.user.monthlyScansUsed } : u))
        );
        showToast(`Added ${count} scan credits to ${data.user.email}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetEmail: string) => {
    if (!confirm(`Are you sure you want to permanently delete user ${targetEmail}? All scans and resumes will be wiped.`)) {
      return;
    }
    setActionLoading(`del-${targetUserId}`);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: targetUserId }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== targetUserId));
        showToast(`User ${targetEmail} removed.`);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (targetUser: AdminUser) => {
    setEditingUser(targetUser);
    setEditFormData({
      displayName: targetUser.displayName || '',
      currentPlan: targetUser.currentPlan,
      role: targetUser.role || 'USER',
      monthlyScansUsed: targetUser.monthlyScansUsed,
      isBanned: !!targetUser.isBanned,
      banReason: targetUser.banReason || '',
    });
  };

  const saveEditUser = async () => {
    if (!editingUser) return;
    setActionLoading('save-edit');
    try {
      const res = await fetch('/api/admin/edit-user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: editingUser.id,
          updates: {
            displayName: editFormData.displayName,
            currentPlan: editFormData.currentPlan,
            role: editFormData.role,
            isAdmin: editFormData.role === 'ADMIN' || editFormData.role === 'OWNER',
            monthlyScansUsed: Number(editFormData.monthlyScansUsed),
            isBanned: editFormData.isBanned,
            banReason: editFormData.banReason,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? data.user : u)));
        setEditingUser(null);
        showToast(`Updated profile for ${data.user.email}`);
        fetchAdminData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update user');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // LLM & BINDINGS ACTIONS
  // ==========================================

  const handleSaveBinding = async (task: string, primaryModelId: string, fallbackModelId: string) => {
    setActionLoading(`bind-${task}`);
    try {
      const res = await fetch('/api/admin/llm-bindings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ task, primaryModelId, fallbackModelId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBindings((prev) => ({ ...prev, [task]: data.binding }));
        showToast(`Task binding updated: ${data.binding.taskLabel}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleLLMStatus = async (llmId: string, currentEnabled: boolean) => {
    setActionLoading(`llm-toggle-${llmId}`);
    try {
      const res = await fetch(`/api/admin/llms/${llmId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setLlms((prev) => prev.map((item) => (item.id === llmId ? data.llm : item)));
        showToast(`LLM ${data.llm.name} ${data.llm.enabled ? 'Enabled' : 'Disabled'}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateLLM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLLMData.name || !newLLMData.modelId) return;
    setActionLoading('create-llm');
    try {
      const res = await fetch('/api/admin/llms', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newLLMData),
      });
      if (res.ok) {
        const data = await res.json();
        setLlms((prev) => [...prev, data.llm]);
        setShowAddLLMModal(false);
        setNewLLMData({
          name: '',
          provider: 'groq',
          modelId: '',
          contextWindow: '128k',
          latencyTier: 'standard',
          apiKeyEnv: 'API_KEY',
        });
        showToast(`New LLM registered: ${data.llm.name}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteLLM = async (llmId: string, name: string) => {
    if (!confirm(`Delete LLM provider config: ${name}?`)) return;
    setActionLoading(`del-llm-${llmId}`);
    try {
      const res = await fetch(`/api/admin/llms/${llmId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setLlms((prev) => prev.filter((item) => item.id !== llmId));
        showToast(`Removed LLM: ${name}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // SYSTEM SETTINGS ACTIONS
  // ==========================================

  // `!currentVal` coerced every numeric setting to `false`, so the limit/price
    // inputs POSTed a boolean and silently never persisted. Invert booleans
    // only, and pass anything else through unchanged.
    const handleToggleSetting = async (key: keyof SystemSettings, currentVal: unknown) => {
      if (!settings) return;
      setActionLoading(`set-${key}`);
      const updated: Record<string, unknown> = {
        [key]: typeof currentVal === 'boolean' ? !currentVal : currentVal,
      };
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const d = await res.json();
        setSettings(d.settings);
        showToast(`Setting '${key}' updated`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // If user is not authenticated as admin, show access restricted view
  if (!isOwnerOrAdmin) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="glass-panel p-8 sm:p-12 rounded-2xl !bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(11,37,69,0.08)] space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-[#0B2545] flex items-center justify-center mx-auto border border-slate-200">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-[#0B2545] border border-slate-300">
              Access Restricted
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
              System Owner & Admin Verification Required
            </h1>
            <p className="text-xs sm:text-sm text-[#334E68] max-w-md mx-auto leading-relaxed">
              This route is protected by administrative role-based access rules. Only accounts with
              verified admin privileges are granted access.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onBackToWorkspace}
              className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-[#334E68] bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
            >
              Return to Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterPlan === 'pro') return u.currentPlan === 'PRO';
    if (filterPlan === 'free') return u.currentPlan === 'FREE';
    if (filterPlan === 'admin') return u.isAdmin || u.role === 'OWNER';
    if (filterPlan === 'banned') return !!u.isBanned;
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 min-w-0">
      {loadErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          <strong className="font-bold">Some panels could not be loaded:</strong>{' '}
          {loadErrors.join(', ')}. The server may have restarted, or your session may have
          expired. Use refresh to retry.
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={onBackToWorkspace}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:text-blue-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workspace</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#627D98]">
              Platform Command Center
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] font-['Space_Grotesk'] tracking-tight">
              Admin & Operations Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-[#0B2545] border border-slate-300 shadow-2xs flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>Owner Access Verified</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#334E68] mt-1">
            Signed in as <span className="font-mono font-bold text-[#1D4ED8]">{user?.email}</span> (Role: {user?.role || 'OWNER'})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0B2545] text-xs font-semibold shadow-xs cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
            title="Refresh stats and users"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#1D4ED8]' : ''}`} />
            <span>Sync Live Data</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1D4ED8] shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ADMIN TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-[#334E68] hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Time</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-[#334E68] hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('llms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'llms'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-[#334E68] hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>LLM Models & Bindings</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-[#334E68] hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Security & Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'monitoring'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-[#334E68] hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Health</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-[#334E68] hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>App Settings</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ANALYTICS & TIME SPENT */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI CARDS (Cohesive color palette) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Total Users & Pro Conversion */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_24px_rgba(11,37,69,0.04)] space-y-1">
              <div className="flex items-center justify-between text-[#627D98]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                {stats?.totalUsers ?? users.length}
              </div>
              <div className="text-[11px] text-[#334E68] flex items-center gap-1 font-semibold">
                <span>{stats?.activeProMembers ?? users.filter((u) => u.currentPlan === 'PRO').length} Active Pro</span>
                <span className="text-slate-300">•</span>
                <span>{stats?.proAdoptionRate ?? 0}% Rate</span>
              </div>
            </div>

            {/* Card 2: Projected Pro MRR */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_24px_rgba(11,37,69,0.04)] space-y-1">
              <div className="flex items-center justify-between text-[#627D98]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Monthly Run Rate</span>
                <CreditCard className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                {stats
                  ? `₹${((stats.activeProMembers || 0) * (settings?.proPriceInr ?? PRO_PRICE_INR)).toLocaleString()}`
                  : 'Not available'}
              </div>
              <div className="text-[11px] text-[#627D98]">
                ₹{settings?.proPriceInr ?? PRO_PRICE_INR}/mo per Pro subscriber
              </div>
            </div>

            {/* Card 3: User Time Spent */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_24px_rgba(11,37,69,0.04)] space-y-1">
              <div className="flex items-center justify-between text-[#627D98]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Avg Session Time</span>
                <Clock className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                {stats ? `${stats.avgSessionDurationMinutes} min` : 'Not available'}
              </div>
              <div className="text-[11px] text-[#334E68]">
                {stats
                  ? `${Math.round(stats.totalTimeSpentSeconds / 60)} min total engagement`
                  : 'Stats endpoint did not respond'}
              </div>
            </div>

            {/* Card 4: Average ATS Match Score */}
            <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_24px_rgba(11,37,69,0.04)] space-y-1">
              <div className="flex items-center justify-between text-[#627D98]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Avg ATS Match</span>
                <Zap className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                {stats ? `${stats.avgAtsScore}%` : 'Not available'}
              </div>
              <div className="text-[11px] text-[#334E68]">
                {stats
                  ? `Across ${stats.totalScansPerformed} candidate scans`
                  : 'Stats endpoint did not respond'}
              </div>
            </div>
          </div>

          {/* Secondary Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Scans by Target Role Breakdown */}
            <div className="glass-panel p-5 rounded-2xl !bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                  Scans by Target Role
                </span>
                <span className="text-[11px] text-[#627D98]">Real Volume</span>
              </div>
              <div className="space-y-2">
                {stats?.scansByRole && Object.keys(stats.scansByRole).length > 0 ? (
                  Object.entries(stats.scansByRole).slice(0, 5).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between text-xs">
                      <span className="text-[#334E68] font-medium truncate max-w-[200px]">{role}</span>
                      <span className="font-mono font-bold text-[#0B2545] bg-slate-100 px-2 py-0.5 rounded-md">
                        {count} {count === 1 ? 'scan' : 'scans'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#627D98] py-4 text-center">No scans recorded yet.</div>
                )}
              </div>
            </div>

            {/* Application Pipeline Status */}
            <div className="glass-panel p-5 rounded-2xl !bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                  Application Pipeline
                </span>
                <span className="text-[11px] text-[#627D98]">
                  {stats?.totalApplicationsTracked ?? 0} Tracked
                </span>
              </div>
              <div className="space-y-2">
                {['APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'].map((stage) => {
                  const count = stats?.applicationsByStatus?.[stage] || 0;
                  return (
                    <div key={stage} className="flex items-center justify-between text-xs">
                      <span className="text-[#334E68] font-medium capitalize">{stage.toLowerCase()}</span>
                      <span className="font-mono font-bold text-[#0B2545] bg-slate-100 px-2 py-0.5 rounded-md">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LLM Token & Cost Utilization */}
            <div className="glass-panel p-5 rounded-2xl !bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B2545]">
                  AI Inference & Costs
                </span>
                <span className="text-[11px] font-mono text-[#1D4ED8]">
                  {stats ? `$${stats.llmMetrics.estimatedCostUsd}` : 'Not available'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#627D98]">Total Tokens</span>
                  <span className="font-mono font-bold text-[#0B2545]">
                    {stats ? `${(stats.llmMetrics.totalTokens / 1000).toFixed(1)}k` : 'Not available'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#627D98]">Groq Tokens (Llama 70B)</span>
                  <span className="font-mono text-[#334E68]">
                    {stats ? `${(stats.llmMetrics.groqTokens / 1000).toFixed(1)}k` : 'Not available'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#627D98]">Gemini Tokens (GenAI)</span>
                  <span className="font-mono text-[#334E68]">
                    {stats ? `${(stats.llmMetrics.geminiTokens / 1000).toFixed(1)}k` : 'Not available'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER DIRECTORY & ACCESS CONTROL */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl !bg-white/80 backdrop-blur-2xl border border-slate-200/80 shadow-[0_12px_32px_rgba(11,37,69,0.04)] space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[#0B2545]">
                User Directory & Access Control
              </h2>
              <p className="text-xs text-[#627D98]">
                Promote any user to Admin or Pro, adjust credits, ban malicious accounts, or edit profiles.
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#627D98] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search email, name, role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:border-[#1D4ED8] text-[#0B2545] w-48 sm:w-56"
                />
              </div>

              <div className="flex items-center p-1 rounded-xl bg-slate-100 text-xs">
                {(['all', 'pro', 'free', 'admin', 'banned'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterPlan(mode)}
                    className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                      filterPlan === mode
                        ? 'bg-white text-[#0B2545] shadow-2xs'
                        : 'text-[#627D98] hover:text-[#0B2545]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                  <th className="py-3 px-4">User / Candidate</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Scans</th>
                  <th className="py-3 px-3">Time Spent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#627D98] italic">
                      No users match the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isOwner = isOwnerEmail(u.email);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#0B2545]">{u.email}</div>
                          <div className="text-[11px] text-[#627D98] flex items-center gap-1.5">
                            {u.displayName && <span>{u.displayName}</span>}
                            <span className="font-mono text-[10px] text-slate-400">({u.id})</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {isOwner ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#0B2545] border border-slate-300">
                              Owner
                            </span>
                          ) : u.isAdmin ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1D4ED8] border border-blue-200">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#627D98]">
                              Candidate
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.currentPlan === 'PRO'
                                ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200 font-bold'
                                : 'bg-slate-100 text-[#627D98]'
                            }`}
                          >
                            {u.currentPlan}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {u.isBanned ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-white">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#334E68]">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-mono font-semibold text-[#0B2545]">
                          {u.currentPlan === 'PRO'
                            ? 'Unlimited'
                            : `${u.monthlyScansUsed}/${settings?.freeTierMonthlyLimit || FREE_SCAN_LIMIT}`}
                        </td>

                        <td className="py-3.5 px-3 text-[#334E68] text-[11px]">
                          {u.totalTimeSpentSeconds
                            ? `${Math.round(u.totalTimeSpentSeconds / 60)} min`
                            : 'No data'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Make Admin / Revoke Admin */}
                            {!isOwner && (
                              <button
                                onClick={() => handleToggleAdmin(u.id, !!u.isAdmin)}
                                disabled={actionLoading === `admin-${u.id}`}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  u.isAdmin
                                    ? 'bg-slate-100 text-[#334E68] hover:bg-slate-200'
                                    : 'bg-blue-50 text-[#1D4ED8] hover:bg-blue-100 border border-blue-200'
                                }`}
                                title={u.isAdmin ? 'Revoke Admin' : 'Make Administrator'}
                              >
                                {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                              </button>
                            )}

                            {/* Toggle Pro */}
                            {!isOwner && (
                              <button
                                onClick={() => handleTogglePro(u.id)}
                                disabled={actionLoading === `pro-${u.id}`}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  u.currentPlan === 'PRO'
                                    ? 'bg-slate-100 text-[#334E68] hover:bg-slate-200'
                                    : 'bg-[#0B2545] text-white hover:bg-slate-800'
                                }`}
                              >
                                {u.currentPlan === 'PRO' ? 'Set Free' : 'Grant Pro'}
                              </button>
                            )}

                            {/* Ban / Unban */}
                            {!isOwner && (
                              <button
                                onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                                disabled={actionLoading === `ban-${u.id}`}
                                className={`p-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  u.isBanned
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-100 text-[#334E68] hover:bg-slate-200'
                                }`}
                                title={u.isBanned ? 'Unban User' : 'Ban User'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Add +3 Credits */}
                            {u.currentPlan !== 'PRO' && (
                              <button
                                onClick={() => handleAddCredits(u.id, 3)}
                                disabled={actionLoading === `credits-${u.id}`}
                                className="p-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-[#0B2545] hover:bg-slate-200 cursor-pointer"
                                title="Add 3 scan credits"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Edit Modal Button */}
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-[#0B2545] hover:bg-slate-200 cursor-pointer"
                              title="Edit user details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete User */}
                            {!isOwner && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                disabled={actionLoading === `del-${u.id}`}
                                className="p-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-800 cursor-pointer"
                                title="Delete user permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LLM MODELS & DYNAMIC TASK BINDINGS */}
      {/* ========================================================================= */}
      {activeTab === 'llms' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[#0B2545]">
                LLM Registry & Dynamic Task Bindings
              </h2>
              <p className="text-xs text-[#627D98]">
                Add new LLMs, configure providers, and dynamically bind tasks (ATS scoring, tailoring, cover letter) to any model.
              </p>
            </div>

            <button
              onClick={() => setShowAddLLMModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#0B2545] to-[#1D4ED8] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>Add New LLM</span>
            </button>
          </div>

          {/* Task Bindings Section */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl !bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#1D4ED8]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B2545]">
                  Dynamic Task Bindings (Orchestration Router)
                </h3>
              </div>
              <span className="text-[11px] text-[#627D98]">Instant Server-side Dispatch</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(bindings).map(([taskKey, binding]) => (
                <div key={taskKey} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0B2545] text-xs">{binding.taskLabel}</span>
                    <span className="font-mono text-[10px] text-[#627D98] uppercase">{taskKey}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-[#627D98] block mb-1">
                        Primary Engine
                      </label>
                      <select
                        value={binding.primaryModelId}
                        onChange={(e) => handleSaveBinding(taskKey, e.target.value, binding.fallbackModelId)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#0B2545]"
                      >
                        {llms.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#627D98] block mb-1">
                        Fallback Engine
                      </label>
                      <select
                        value={binding.fallbackModelId}
                        onChange={(e) => handleSaveBinding(taskKey, binding.primaryModelId, e.target.value)}
                        className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-[#0B2545]"
                      >
                        {llms.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configured Models Table */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl !bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B2545]">
              Active LLM Providers ({llms.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                    <th className="py-2.5 px-3">Model Name</th>
                    <th className="py-2.5 px-3">Provider</th>
                    <th className="py-2.5 px-3">Model Identifier</th>
                    <th className="py-2.5 px-3">Context</th>
                    <th className="py-2.5 px-3">Latency Tier</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {llms.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-[#0B2545]">{m.name}</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-semibold text-[#627D98]">{m.provider}</td>
                      <td className="py-3 px-3 font-mono text-[#334E68]">{m.modelId}</td>
                      <td className="py-3 px-3 font-mono text-[#334E68]">{m.contextWindow}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-[#334E68]">
                          {m.latencyTier}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            m.enabled
                              ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                              : 'bg-slate-100 text-[#627D98]'
                          }`}
                        >
                          {m.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleLLMStatus(m.id, m.enabled)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-[#334E68] hover:bg-slate-200 cursor-pointer"
                          >
                            {m.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteLLM(m.id, m.name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Delete LLM"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SECURITY & THREAT SHIELD */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Status Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B2545] text-xs">Prompt Injection Shield</span>
                <button
                  onClick={() => handleToggleSetting('promptInjectionShield', settings?.promptInjectionShield)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    settings?.promptInjectionShield
                      ? 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                      : 'bg-slate-100 text-[#627D98]'
                  }`}
                >
                  {settings?.promptInjectionShield ? 'Active' : 'Disabled'}
                </button>
              </div>
              <p className="text-[11px] text-[#627D98]">
                Regex interceptors block jailbreak tokens, system prompt overrides, and template injections.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B2545] text-xs">5MB Upload File Sandbox</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200">
                  Enforced
                </span>
              </div>
              <p className="text-[11px] text-[#627D98]">
                Multer memory limiter rejects unapproved MIME types and files exceeding 5MB payload quota.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B2545] text-xs">Client Rate Limiter</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200">
                  30 Req / Min
                </span>
              </div>
              <p className="text-[11px] text-[#627D98]">
                Dual-mode IP and session-based rate limiter prevents denial-of-service and brute force abuse.
              </p>
            </div>
          </div>

          {/* Security Audit Log Table */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl !bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#1D4ED8]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B2545]">
                  Security Audit Events Log ({securityLogs.length})
                </h3>
              </div>
              <span className="text-[11px] text-[#627D98]">Real-time Telemetry</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {securityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-[#627D98]">
                        No security incidents logged.
                      </td>
                    </tr>
                  ) : (
                    securityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#627D98]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0B2545]">{log.event}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.severity === 'critical'
                                ? 'bg-slate-800 text-white'
                                : log.severity === 'warning'
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : 'bg-slate-100 text-[#334E68]'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#334E68] text-xs">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM HEALTH & REAL-TIME MONITORING */}
      {/* ========================================================================= */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6 animate-in fade-in">
          {health ? (
            <>
              {/* Uptime & Process Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                    Server Uptime
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                    {health.uptime}
                  </div>
                  <div className="text-[11px] text-[#334E68]">Node {health.nodeVersion}</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                    Memory RSS
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                    {health.memoryRssMb} MB
                  </div>
                  <div className="text-[11px] text-[#334E68]">
                    Heap: {health.heapUsedMb}MB / {health.heapTotalMb}MB
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                    Process Host
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                    {health.platform}
                  </div>
                  <div className="text-[11px] text-[#334E68]">PID {health.pid}</div>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                    Error Rate
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#0B2545] font-['Space_Grotesk']">
                    Not measured
                  </div>
                  <div className="text-[11px] text-[#627D98]">
                    This server does not collect error-rate telemetry
                  </div>
                </div>
              </div>

              {/* Subsystems Matrix */}
              <div className="glass-panel p-5 sm:p-6 rounded-2xl !bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B2545]">
                  Subsystem Health Matrix
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(health.services || []).map((svc) => (
                    <div key={svc.name} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#0B2545] text-xs">{svc.name}</div>
                        <div className="text-[11px] text-[#627D98] font-mono">{svc.latencyMs}ms response latency</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1D4ED8] border border-blue-200">
                        {svc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 sm:p-12 text-center rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200/70">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2545] font-['Space_Grotesk']">
                System health unavailable
              </h3>
              <p className="text-xs sm:text-sm text-[#334E68] max-w-lg mx-auto leading-relaxed">
                {loading
                  ? 'Waiting for the first health reading…'
                  : endpointErrors.health
                  ? `The health endpoint did not return a reading: ${endpointErrors.health}.`
                  : 'The health endpoint returned no reading. Retrying automatically every 15 seconds.'}
              </p>
              <p className="text-xs text-[#627D98]">
                Nothing is displayed here because no live measurement was received.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: GLOBAL APPLICATION SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl !bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[#0B2545]">
              Platform & MicroSaaS Configuration
            </h2>
            <p className="text-xs text-[#627D98]">
              Adjust tier limits, pricing tiers, and system operational flags.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-[#0B2545] block">
                Free Tier Monthly Scan Limit
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings?.freeTierMonthlyLimit || FREE_SCAN_LIMIT}
                  onChange={(e) =>
                    setSettings((prev) => prev ? { ...prev, freeTierMonthlyLimit: Number(e.target.value) } : prev)
                  }
                  className="w-24 p-2 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold"
                />
                <button
                  onClick={() => handleToggleSetting('freeTierMonthlyLimit' as any, (settings?.freeTierMonthlyLimit || FREE_SCAN_LIMIT) - 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#0B2545] text-white text-xs font-bold cursor-pointer"
                >
                  Save Limit
                </button>
              </div>
              <p className="text-[11px] text-[#627D98]">
                Standard candidate entitlement for unauthenticated/free accounts.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-[#0B2545] block">
                Pro Monthly Price (INR)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings?.proPriceInr || PRO_PRICE_INR}
                  onChange={(e) =>
                    setSettings((prev) => prev ? { ...prev, proPriceInr: Number(e.target.value) } : prev)
                  }
                  className="w-24 p-2 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold"
                />
                <button
                  onClick={() => handleToggleSetting('proPriceInr' as any, (settings?.proPriceInr || PRO_PRICE_INR) - 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#0B2545] text-white text-xs font-bold cursor-pointer"
                >
                  Save Price
                </button>
              </div>
              <p className="text-[11px] text-[#627D98]">
                Displayed across pricing modals and Razorpay payment links.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#0B2545] block">Maintenance Mode</span>
                <p className="text-[11px] text-[#627D98]">
                  When active, non-admin visitors see a scheduled maintenance notice.
                </p>
              </div>
              <button
                onClick={() => handleToggleSetting('maintenanceMode', settings?.maintenanceMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  settings?.maintenanceMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-[#334E68]'
                }`}
              >
                {settings?.maintenanceMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#0B2545] block">Prompt Injection Shield</span>
                <p className="text-[11px] text-[#627D98]">
                  Filters inputs against adversarial jailbreaks before calling models.
                </p>
              </div>
              <button
                onClick={() => handleToggleSetting('promptInjectionShield', settings?.promptInjectionShield)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  settings?.promptInjectionShield ? 'bg-[#0B2545] text-white' : 'bg-slate-200 text-[#334E68]'
                }`}
              >
                {settings?.promptInjectionShield ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT USER DETAILS */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl !bg-white border border-slate-200 shadow-2xl w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0B2545] font-['Space_Grotesk']">
                  Edit User Profile
                </h3>
                <span className="text-xs text-[#627D98] font-mono">{editingUser.email}</span>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#334E68] block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editFormData.displayName}
                  onChange={(e) => setEditFormData({ ...editFormData, displayName: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#334E68] block mb-1">Plan</label>
                  <select
                    value={editFormData.currentPlan}
                    onChange={(e) => setEditFormData({ ...editFormData, currentPlan: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="FREE">FREE</option>
                    <option value="PRO">PRO</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#334E68] block mb-1">Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="USER">USER (Candidate)</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#334E68] block mb-1">Monthly Scans Used</label>
                <input
                  type="number"
                  value={editFormData.monthlyScansUsed}
                  onChange={(e) => setEditFormData({ ...editFormData, monthlyScansUsed: Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs font-bold"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 font-bold text-[#0B2545] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isBanned}
                    onChange={(e) => setEditFormData({ ...editFormData, isBanned: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <span>Suspend / Ban Account</span>
                </label>
                {editFormData.isBanned && (
                  <input
                    type="text"
                    placeholder="Suspension reason..."
                    value={editFormData.banReason}
                    onChange={(e) => setEditFormData({ ...editFormData, banReason: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#334E68] font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveEditUser}
                disabled={actionLoading === 'save-edit'}
                className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-slate-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD NEW LLM PROVIDER */}
      {/* ========================================================================= */}
      {showAddLLMModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateLLM}
            className="glass-panel p-6 rounded-2xl !bg-white border border-slate-200 shadow-2xl w-full max-w-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0B2545] font-['Space_Grotesk']">
                  Add New LLM Engine
                </h3>
                <span className="text-xs text-[#627D98]">Register a new model for tasks and fallbacks</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLLMModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#334E68] block mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="e.g., Llama 3.1 8B Instant"
                  value={newLLMData.name}
                  onChange={(e) => setNewLLMData({ ...newLLMData, name: e.target.value })}
                  required
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#334E68] block mb-1">Provider</label>
                  <select
                    value={newLLMData.provider}
                    onChange={(e) => setNewLLMData({ ...newLLMData, provider: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="groq">Groq</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom / Ollama</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#334E68] block mb-1">Model Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g., llama-3.1-8b-instant"
                    value={newLLMData.modelId}
                    onChange={(e) => setNewLLMData({ ...newLLMData, modelId: e.target.value })}
                    required
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#334E68] block mb-1">Context Window</label>
                  <input
                    type="text"
                    placeholder="e.g., 128k"
                    value={newLLMData.contextWindow}
                    onChange={(e) => setNewLLMData({ ...newLLMData, contextWindow: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#334E68] block mb-1">Latency Tier</label>
                  <select
                    value={newLLMData.latencyTier}
                    onChange={(e) => setNewLLMData({ ...newLLMData, latencyTier: e.target.value as any })}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="sub-second">sub-second (&lt;500ms)</option>
                    <option value="standard">standard (~1s)</option>
                    <option value="deep-reasoning">deep-reasoning (~2s+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#334E68] block mb-1">API Key Env Variable</label>
                <input
                  type="text"
                  placeholder="e.g., GROQ_API_KEY or CUSTOM_API_KEY"
                  value={newLLMData.apiKeyEnv}
                  onChange={(e) => setNewLLMData({ ...newLLMData, apiKeyEnv: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddLLMModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#334E68] font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'create-llm'}
                className="px-4 py-2 rounded-xl bg-[#0B2545] hover:bg-slate-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                Register Model
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
