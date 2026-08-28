import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { apiService } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useToast } from '../common/Toast';
import {
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Building2,
  Loader2,
  KeyRound,
  LogIn,
  UserPlus,
  AlertOctagon
} from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (user: User, token: string) => void;
  initialMode?: 'login' | 'register' | 'forgot';
  initialPortal?: 'STUDENT' | 'STAFF' | 'ADMIN';
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

export const AuthPage: React.FC<AuthPageProps> = ({
  onLoginSuccess,
  initialMode = 'login',
  initialPortal = 'STUDENT'
}) => {
  const { showToast } = useToast();
  const [portal, setPortal] = useState<'STUDENT' | 'STAFF' | 'ADMIN'>(initialPortal);
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

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Handle Student Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Requirement 3 & 6: Ignore repeated clicks and ensure single request per click
    if (loading) return;

    if (portal !== 'STUDENT') {
      showToast('Unauthorized', 'Staff and Admin accounts are created strictly by the Admin Dashboard.', 'error');
      return;
    }

    if (!regName.trim() || !regEmail.trim() || !regRollNo.trim() || !regPhone.trim()) {
      const msg = 'Please fill in all required registration fields.';
      setAuthError(msg);
      showToast('Missing Fields', msg, 'error');
      return;
    }

    if (!regEmail.includes('@')) {
      const msg = 'Please enter a valid university email address.';
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

      // 1. Register User in Supabase Auth
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

      console.log('[Supabase Auth Response] signUp:', { data: sbData, error: sbErr });

      // Detect "Email rate limit exceeded" error and show friendly message
      if (sbErr) {
        console.error('[Supabase Auth Error] Registration failed:', sbErr);
        const errStr = (sbErr.message || '').toLowerCase();
        const isRateLimit = sbErr.status === 429 || errStr.includes('rate limit') || errStr.includes('rate_limit') || errStr.includes('too many');

        if (isRateLimit) {
          const friendlyMsg = "Too many signup attempts. Please wait a few minutes and try again.";
          setAuthError(friendlyMsg);
          showToast('Signup Rate Limit Exceeded', friendlyMsg, 'error');
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

        throw new Error(sbErr.message || 'Could not complete registration with Supabase Auth.');
      }

      if (!sbData || !sbData.user) {
        throw new Error('Failed to create account in Supabase Authentication.');
      }

      const userId = sbData.user.id;
      console.log('[Supabase Auth] User account created with ID:', userId);

      // 2. Create Profile record in Supabase profiles table
      const profileRecord = {
        auth_user_id: userId,
        full_name: regName.trim(),
        email: cleanEmail,
        phone: regPhone.trim(),
        roll_number: cleanRollNo,
        branch: regBranch,
        year: regYear,
        role: 'student',
        created_at: new Date().toISOString()
      };

      const { error: profErr } = await supabase.from('profiles').upsert(profileRecord, { onConflict: 'email' });
      if (profErr) {
        console.warn('[Supabase DB Note] Profile creation note:', profErr.message);
      }

      // Sync user details to backend API store for audit trail & server record
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
      } catch (apiErr) {
        console.log('[Server Sync Log] Non-critical background sync note:', apiErr);
      }

      // Requirement 4 & 5: Check whether email confirmation is required in Supabase project
      const isEmailUnconfirmed = !sbData.session && Boolean(
        sbData.user.confirmation_sent_at ||
        !sbData.user.email_confirmed_at
      );

      if (isEmailUnconfirmed) {
        console.log('[Auth Flow] Email verification enabled in Supabase.');
        setAuthError(null);
        showToast(
          'Registration Successful!',
          'Please verify your email before logging in.',
          'info'
        );
        setLoginEmail(cleanEmail);
        setLoginPassword('');
        setMode('login');
      } else {
        console.log('[Auth Flow] Registration active immediately without email confirmation.');
        setAuthError(null);
        showToast(
          'Registration Successful!',
          `Account created for ${regName.trim()}. You can log in immediately.`,
          'success'
        );
        setLoginEmail(cleanEmail);
        setLoginPassword(regPassword);
        setMode('login');
      }

    } catch (err: any) {
      console.error('[Auth Registration Exception]', err);
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
    setAuthError(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      const msg = 'Please enter both email and password.';
      setAuthError(msg);
      showToast('Login Required', msg, 'warning');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      console.log('[Auth Flow] Initiating login for:', cleanEmail, 'in portal:', portal);

      // 1. Authenticate against Supabase Auth, falling back to database auth session
      let loggedInUser: User | null = null;
      let userToken = '';

      const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: loginPassword
      });

      console.log('[Supabase Auth Response] signInWithPassword:', { data: sbAuth, error: sbErr });

      if (!sbErr && sbAuth && sbAuth.user) {
        const authUser = sbAuth.user;
        console.log('[Supabase Auth] Session established for user ID:', authUser.id);

        // Retrieve user profile details from Supabase 'profiles' table
        const { data: sbProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        const userRole = (sbProfile?.role as UserRole) || (authUser.user_metadata?.role as UserRole) || (cleanEmail.includes('admin') ? 'ADMIN' : cleanEmail.includes('staff') ? 'STAFF' : 'STUDENT');
        const userName = sbProfile?.name || sbProfile?.full_name || authUser.user_metadata?.full_name || cleanEmail.split('@')[0];

        loggedInUser = {
          id: authUser.id,
          name: userName,
          email: cleanEmail,
          role: userRole,
          department: sbProfile?.branch || authUser.user_metadata?.branch || sbProfile?.department || 'Operations',
          rollNo: sbProfile?.roll_no || sbProfile?.roll_number || authUser.user_metadata?.roll_no || '',
          branch: sbProfile?.branch || authUser.user_metadata?.branch || '',
          year: sbProfile?.year || authUser.user_metadata?.year || '',
          phone: sbProfile?.phone || authUser.user_metadata?.phone || '',
          avatar: sbProfile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`,
          createdAt: sbProfile?.created_at || new Date().toISOString()
        };
        userToken = sbAuth.session?.access_token || `sb-token-${loggedInUser.id}`;
      } else {
        console.warn('[Auth Flow] Supabase Auth login note, attempting database session login:', sbErr?.message);
        try {
          const apiRes = await apiService.login(cleanEmail, loginPassword);
          loggedInUser = apiRes.user;
          userToken = apiRes.token;
        } catch (apiErr: any) {
          console.error('[Auth Flow] Both Supabase Auth & Backend Login failed:', apiErr);
          if (sbErr?.message.toLowerCase().includes('email not confirmed') || sbErr?.message.toLowerCase().includes('unconfirmed')) {
            throw new Error('Please verify your email before logging in.');
          }
          throw new Error('Invalid email or password.');
        }
      }

      if (!loggedInUser) {
        throw new Error('Authentication failed. User session could not be established.');
      }

      // 3. Strict Portal Role Access Check
      if (portal === 'STUDENT' && loggedInUser.role !== 'STUDENT') {
        const msg = `This account is a ${loggedInUser.role} account. Please use the ${loggedInUser.role} Portal.`;
        setAuthError(msg);
        showToast('Access Denied', msg, 'error');
        return;
      }
      if (portal === 'STAFF' && loggedInUser.role !== 'STAFF') {
        const msg = `This account is a ${loggedInUser.role} account. Please use the ${loggedInUser.role} Portal.`;
        setAuthError(msg);
        showToast('Access Denied', msg, 'error');
        return;
      }
      if (portal === 'ADMIN' && loggedInUser.role !== 'ADMIN') {
        const msg = `This account is a ${loggedInUser.role} account. Please use the ${loggedInUser.role} Portal.`;
        setAuthError(msg);
        showToast('Access Denied', msg, 'error');
        return;
      }

      console.log('[Auth Flow] Login successful. Navigating to portal:', loggedInUser.role);
      showToast('Welcome Back!', `Logged in to ${portal} Portal as ${loggedInUser.name}`, 'success');
      onLoginSuccess(loggedInUser, userToken);

    } catch (err: any) {
      console.error('[Auth Login Exception]', err);
      const errMsg = err.message || 'Invalid email or password.';
      setAuthError(errMsg);
      showToast('Authentication Failed', errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Email Required', 'Please enter your registered email address.', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
        if (error) console.warn('Supabase reset password note:', error.message);
      }

      const res = await apiService.forgotPassword(forgotEmail.trim());
      showToast('Reset Link Sent', res.message, 'success');
      setMode('reset');
    } catch (err: any) {
      showToast('Reset Error', err.message || 'No account found with this email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetNewPassword || resetNewPassword.length < 6) {
      showToast('Invalid Password', 'New password must be at least 6 characters long.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await apiService.resetPassword(forgotEmail, resetNewPassword);
      showToast('Password Updated', res.message, 'success');
      setMode('login');
    } catch (err: any) {
      showToast('Reset Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 my-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">

        {/* Portal Selection Tabs at Very Top */}
        <div className="bg-slate-950 p-2 border-b border-slate-800 flex items-center gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setPortal('STUDENT'); setMode('login'); setAuthError(null); }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              portal === 'STUDENT'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Student Portal
          </button>
          <button
            type="button"
            onClick={() => { setPortal('STAFF'); setMode('login'); setAuthError(null); }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              portal === 'STAFF'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Staff Portal
          </button>
          <button
            type="button"
            onClick={() => { setPortal('ADMIN'); setMode('login'); setAuthError(null); }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              portal === 'ADMIN'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Admin Portal
          </button>
        </div>

        {/* Top Header */}
        <div className="p-6 sm:p-8 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl ${
              portal === 'STUDENT' ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-600/30' :
              portal === 'STAFF' ? 'bg-gradient-to-tr from-amber-600 to-orange-600 shadow-amber-600/30' :
              'bg-gradient-to-tr from-purple-600 to-pink-600 shadow-purple-600/30'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
                {portal === 'STUDENT' && (mode === 'login' ? 'Student Portal Sign In' : 'Student Account Registration')}
                {portal === 'STAFF' && 'Staff & Technician Sign In'}
                {portal === 'ADMIN' && 'Admin Command Center Sign In'}
              </h2>
              <p className="text-xs text-slate-400">Campus Connect – Vignan University Issue Resolution System</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 mt-6 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            {portal === 'STUDENT' ? (
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  mode === 'register'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
            ) : (
              <span className="flex-1 text-center py-2 text-[11px] text-slate-500 italic">
                {portal === 'STAFF' ? 'Staff created by Admin' : 'Admin created by System'}
              </span>
            )}
          </div>
        </div>

        {/* Main Body Forms */}
        <div className="p-6 sm:p-8 bg-slate-900">

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">University Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    placeholder="student@vignan.ac.in"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
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
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              {/* Quick Demo Credential Autofill */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-400 font-semibold">
                  <span>Default {portal} Login Credentials:</span>
                  <span className="text-purple-400 font-bold">Quick Fill</span>
                </div>
                {portal === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@vignan.ac.in');
                      setLoginPassword('admin123');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/20 text-purple-200 transition-colors font-mono flex items-center justify-between"
                  >
                    <span>Email: <strong>admin@vignan.ac.in</strong></span>
                    <span className="text-[10px] bg-purple-800/50 px-1.5 py-0.5 rounded text-purple-100">Pass: admin123</span>
                  </button>
                )}
                {portal === 'STAFF' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('rajesh.kumar@campus.edu');
                      setLoginPassword('staff123');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/20 text-amber-200 transition-colors font-mono flex items-center justify-between"
                  >
                    <span>Email: <strong>rajesh.kumar@campus.edu</strong></span>
                    <span className="text-[10px] bg-amber-800/50 px-1.5 py-0.5 rounded text-amber-100">Pass: staff123</span>
                  </button>
                )}
                {portal === 'STUDENT' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('student@vignan.ac.in');
                      setLoginPassword('student123');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/20 text-indigo-200 transition-colors font-mono flex items-center justify-between"
                  >
                    <span>Email: <strong>student@vignan.ac.in</strong></span>
                    <span className="text-[10px] bg-indigo-800/50 px-1.5 py-0.5 rounded text-indigo-100">Pass: student123</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Sign In to {portal === 'STUDENT' ? 'Student Portal' : portal === 'STAFF' ? 'Staff Portal' : 'Admin Portal'}
              </button>

              {portal === 'STUDENT' && (
                <div className="pt-4 border-t border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    New student to Vignan Campus?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-indigo-400 font-bold hover:underline ml-1"
                    >
                      Create an account
                    </button>
                  </p>
                </div>
              )}
            </form>
          )}

          {/* 2. REGISTRATION FORM (STUDENT ONLY) */}
          {mode === 'register' && portal === 'STUDENT' && (
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
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
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
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      placeholder="student@vignan.ac.in"
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
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Roll Number, Branch & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Roll Number *</label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="22L31A05XX"
                      value={regRollNo}
                      onChange={(e) => setRegRollNo(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono uppercase focus:outline-none focus:border-indigo-500 transition-colors"
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
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
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
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
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
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Complete Student Registration
              </button>

              <div className="pt-3 text-center border-t border-slate-800">
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-indigo-400 font-bold hover:underline ml-1"
                  >
                    Log in here
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your registered university email. We will process password reset instructions securely via Supabase Auth.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    placeholder="student@vignan.ac.in"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Send Reset Password Link
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

          {/* 4. RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <p className="text-xs text-slate-400">
                Enter your new password for account <strong className="text-indigo-400">{forgotEmail}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Update Password & Log In
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
