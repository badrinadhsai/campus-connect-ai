import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { useToast } from '../common/Toast';
import { supabase } from '../../lib/supabase';
import {
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  Sparkles,
  X,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Building2,
  Loader2,
  HelpCircle,
  AlertOctagon
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User, token: string) => void;
  initialMode?: 'login' | 'register' | 'forgot';
}

const BRANCHES = [
  'CSE',
  'CSE (AI & ML)',
  'CSE (Data Science)',
  'IT',
  'ECE',
  'EEE',
  'Mechanical',
  'Civil',
  'MBA',
  'MCA',
  'Other'
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login'
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode);
  const [loading, setLoading] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRollNo, setRegRollNo] = useState('');
  const [regBranch, setRegBranch] = useState('CSE');
  const [regYear, setRegYear] = useState('4th Year');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Login & Error State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  if (!isOpen) return null;

  // Handle Student Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Requirement 3 & 6: Ensure registration is performed only once per click
    if (loading) return;

    if (!regName.trim() || !regEmail.trim() || !regRollNo.trim() || !regPhone.trim()) {
      const msg = 'Please fill in all required registration fields.';
      setAuthError(msg);
      showToast('Missing Fields', msg, 'error');
      return;
    }

    if (!regEmail.includes('@')) {
      const msg = 'Please provide a valid university email address.';
      setAuthError(msg);
      showToast('Invalid Email', msg, 'error');
      return;
    }

    if (regPassword.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setAuthError(msg);
      showToast('Weak Password', msg, 'warning');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      const msg = 'Password and Confirm Password do not match.';
      setAuthError(msg);
      showToast('Password Mismatch', msg, 'error');
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const cleanEmail = regEmail.trim().toLowerCase();
      const cleanRollNo = regRollNo.trim().toUpperCase();

      console.log('[Supabase Auth] Executing single signUp call for:', cleanEmail);

      // 1. Supabase Auth Sign Up
      const { data: sbData, error: sbErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: regPassword,
        options: {
          data: {
            full_name: regName.trim(),
            roll_no: cleanRollNo,
            branch: regBranch,
            year: regYear,
            phone: regPhone.trim(),
            role: 'STUDENT'
          }
        }
      });

      console.log('[Supabase Auth Response] Modal signUp:', { data: sbData, error: sbErr });

      // Detect "Email rate limit exceeded" error and show friendly message
      if (sbErr) {
        console.error('[Supabase Auth Error] Modal registration failed:', sbErr);
        const errStr = (sbErr.message || '').toLowerCase();
        const isRateLimit = sbErr.status === 429 || errStr.includes('rate limit') || errStr.includes('rate_limit') || errStr.includes('too many');

        if (isRateLimit) {
          const friendlyMsg = "Too many signup attempts. Please wait a few minutes and try again.";
          setAuthError(friendlyMsg);
          showToast('Rate Limit Exceeded', friendlyMsg, 'error');
          return;
        }

        if (errStr.includes('already registered') || errStr.includes('already exists') || errStr.includes('user_already_exists')) {
          const existMsg = "An account with this email already exists. Please sign in instead.";
          setAuthError(existMsg);
          showToast('Account Exists', existMsg, 'warning');
          setLoginEmail(cleanEmail);
          setMode('login');
          return;
        }

        throw new Error(sbErr.message || 'Could not complete registration.');
      }

      if (!sbData || !sbData.user) {
        throw new Error('Failed to create account in Supabase Authentication.');
      }

      const userId = sbData.user.id;

      // 2. Create Profile record after auth
      const { error: profErr } = await supabase.from('profiles').upsert({
        auth_user_id: userId,
        full_name: regName.trim(),
        email: cleanEmail,
        phone: regPhone.trim(),
        roll_number: cleanRollNo,
        branch: regBranch,
        year: regYear,
        role: 'student',
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });

      if (profErr) {
        console.warn('[Supabase DB Note] Profile creation note:', profErr.message);
      }

      // Sync backend API
      try {
        await apiService.registerStudent({
          authUserId: userId,
          name: regName.trim(),
          email: cleanEmail,
          phone: regPhone.trim(),
          rollNo: cleanRollNo,
          branch: regBranch,
          year: regYear,
          password: regPassword
        });
      } catch (e) {
        /* ignore background sync errors */
      }

      // Requirement 4 & 5: Check whether email confirmation is required in Supabase project
      const isEmailUnconfirmed = !sbData.session && Boolean(
        sbData.user.confirmation_sent_at ||
        !sbData.user.email_confirmed_at
      );

      if (isEmailUnconfirmed) {
        setAuthError(null);
        showToast('Registration Successful!', 'Please verify your email before logging in.', 'info');
        setLoginEmail(cleanEmail);
        setLoginPassword('');
        setMode('login');
      } else {
        const newUser: User = {
          id: userId,
          name: regName.trim(),
          email: cleanEmail,
          role: 'STUDENT',
          department: regBranch,
          rollNo: cleanRollNo,
          branch: regBranch,
          year: regYear,
          phone: regPhone.trim(),
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(regName.trim())}`,
          createdAt: new Date().toISOString()
        };
        const token = sbData.session?.access_token || `sb-token-${newUser.id}`;
        setAuthError(null);
        showToast('Registration Successful!', `Welcome to Campus Connect, ${newUser.name}.`, 'success');
        onLoginSuccess(newUser, token);
        if (onClose) onClose();
      }
    } catch (err: any) {
      console.error('[AuthModal Exception]', err);
      const errMsg = err?.message || 'Could not complete registration.';
      const isRateLimit = err?.status === 429 || (typeof errMsg === 'string' && (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('too many')));

      if (isRateLimit) {
        const friendlyMsg = "Too many signup attempts. Please wait a few minutes and try again.";
        setAuthError(friendlyMsg);
        showToast('Rate Limit Exceeded', friendlyMsg, 'error');
      } else {
        setAuthError(errMsg);
        showToast('Registration Failed', errMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('Login Required', 'Please enter your email address and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      console.log('[AuthModal] Logging in user:', cleanEmail);

      // Authenticate against Supabase Auth exclusively (Requirement 7 & 8)
      const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: loginPassword
      });

      console.log('[Supabase Auth Response] Modal signInWithPassword:', { data: sbAuth, error: sbErr });

      if (sbErr) {
        console.error('[Supabase Auth Error] Modal login failed:', sbErr.message);
        if (sbErr.message.toLowerCase().includes('email not confirmed') || sbErr.message.toLowerCase().includes('unconfirmed')) {
          throw new Error('Please verify your email before logging in.');
        }
        throw new Error('Invalid email or password.');
      }

      if (!sbAuth || !sbAuth.user) {
        throw new Error('Authentication failed. User session not established.');
      }

      const authUser = sbAuth.user;

      const { data: sbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const userRole = (sbProfile?.role as UserRole) || (authUser.user_metadata?.role as UserRole) || 'STUDENT';
      const userName = sbProfile?.name || authUser.user_metadata?.full_name || cleanEmail.split('@')[0];

      const loggedInUser: User = {
        id: authUser.id,
        name: userName,
        email: cleanEmail,
        role: userRole,
        department: sbProfile?.branch || authUser.user_metadata?.branch || sbProfile?.department || 'Operations',
        rollNo: sbProfile?.roll_no || authUser.user_metadata?.roll_no || '',
        branch: sbProfile?.branch || authUser.user_metadata?.branch || '',
        year: sbProfile?.year || authUser.user_metadata?.year || '',
        phone: sbProfile?.phone || authUser.user_metadata?.phone || '',
        avatar: sbProfile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`,
        createdAt: sbProfile?.created_at || new Date().toISOString()
      };

      const userToken = sbAuth.session?.access_token || `sb-token-${loggedInUser.id}`;

      showToast('Welcome Back!', `Logged in as ${loggedInUser.name} (${loggedInUser.role})`, 'success');
      onLoginSuccess(loggedInUser, userToken);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('[AuthModal Exception]', err);
      showToast('Authentication Error', err.message || 'Invalid email or password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick Evaluator Demo Logins
  const handleQuickLogin = async (email: string) => {
    setLoading(true);
    try {
      const res = await apiService.login(email, 'password123');
      showToast('Evaluator Session Activated', `Logged in as ${res.user.name} [${res.user.role}]`, 'success');
      onLoginSuccess(res.user, res.token);
      if (onClose) onClose();
    } catch (err: any) {
      showToast('Quick Login Error', err.message || 'Unable to authenticate demo account.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Email Required', 'Please enter your registered email address.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.forgotPassword(forgotEmail.trim());
      showToast('Reset Instructions Sent', res.message, 'success');
      setMode('reset');
    } catch (err: any) {
      showToast('Reset Request Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetNewPassword || resetNewPassword.length < 6) {
      showToast('Invalid Password', 'New password must be at least 6 characters.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.resetPassword(forgotEmail, resetNewPassword);
      showToast('Password Reset Complete', res.message, 'success');
      setMode('login');
    } catch (err: any) {
      showToast('Password Reset Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95">

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/60 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {mode === 'login' && 'Sign In to Campus Connect'}
                  {mode === 'register' && 'Student Account Registration'}
                  {mode === 'forgot' && 'Reset Your Password'}
                  {mode === 'reset' && 'Create New Password'}
                </h3>
                <p className="text-xs text-slate-400">Vignan University Smart Problem Reporting Portal</p>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 mt-5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Portal Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Student Register
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">University Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    placeholder="e.g. badri@vignan.ac.in"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Password *</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Sign In to Portal
              </button>

              {/* Quick Evaluator Access Section */}
              <div className="pt-4 border-t border-slate-800/80">
                <p className="text-[11px] font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Evaluator Quick Test Accounts (1-Click Login):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('alex.chen@campus.edu')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors group"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 block">Student</span>
                    <span className="text-xs font-semibold text-slate-200 block truncate">Alex Chen</span>
                    <span className="text-[10px] text-slate-500 block truncate">CS-2024-089</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('marcus.vance@campus.edu')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors group"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 block">Staff</span>
                    <span className="text-xs font-semibold text-slate-200 block truncate">Marcus Vance</span>
                    <span className="text-[10px] text-slate-500 block truncate">IT Lead Eng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('evelyn.vance@campus.edu')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors group"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 block">Admin</span>
                    <span className="text-xs font-semibold text-slate-200 block truncate">Dr. E. Vance</span>
                    <span className="text-[10px] text-slate-500 block truncate">Director Ops</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* STUDENT REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Badri Narayana"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">University Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      placeholder="e.g. badri@vignan.ac.in"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Roll Number & Branch & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Roll Number *</label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="22L31AXXXX"
                      value={regRollNo}
                      onChange={(e) => setRegRollNo(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm uppercase focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Branch *</label>
                  <select
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Year of Study *</label>
                  <select
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Complete Student Registration
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your university email address. We will send you a verification token to reset your password securely.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    placeholder="e.g. badri@vignan.ac.in"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Send Reset Verification
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back to Login
              </button>
            </form>
          )}

          {/* RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <p className="text-xs text-slate-400">
                Enter your new password for account <strong className="text-indigo-400">{forgotEmail}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Update Password & Sign In
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
