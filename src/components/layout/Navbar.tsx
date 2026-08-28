import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { NotificationBell } from '../notifications/NotificationBell';
import { 
  Building2, 
  ChevronDown, 
  PlusCircle, 
  Shield, 
  Wrench, 
  GraduationCap, 
  BarChart3, 
  FileCode2, 
  Moon, 
  Sun, 
  LogOut, 
  User as UserIcon, 
  LogIn 
} from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewComplaint: () => void;
  onOpenDocs?: () => void;
  onSelectComplaint?: (complaintId: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectUser,
  onLogout,
  onOpenAuthModal,
  onOpenProfileModal,
  activeTab,
  setActiveTab,
  onOpenNewComplaint,
  onOpenDocs,
  onSelectComplaint,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const userRole = currentUser?.role || null;
  const isStudent = userRole === 'STUDENT';
  const isStaff = userRole === 'STAFF';
  const isAdmin = userRole === 'ADMIN';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
            if (isStudent || !currentUser) setActiveTab('student');
            else if (isStaff) setActiveTab('staff');
            else if (isAdmin) setActiveTab('admin');
          }}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight">
                  CampusConnect
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">Smart Resolution Platform</p>
            </div>
          </div>

          {/* Nav Tabs - Role Restricted */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            {/* Student Portal - Visible to everyone */}
            <button
              onClick={() => setActiveTab('student')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'student'
                  ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Student Portal
            </button>

            {/* Staff Workspace - Only visible to Staff & Admin */}
            {(isStaff || isAdmin) && (
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'staff'
                    ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Staff Workspace
              </button>
            )}

            {/* Admin Command - Only visible to Admin */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Command
              </button>
            )}

            {/* Analytics - Visible to Staff & Admin */}
            {(isStaff || isAdmin) && (
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </button>
            )}

            {/* Architecture / Docs */}
            {onOpenDocs && (
              <button
                onClick={onOpenDocs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                Docs & DB
              </button>
            )}
          </nav>

          {/* Actions & Profile */}
          <div className="flex items-center gap-3">
            
            {/* Theme Toggle */}
            <button
              onClick={onToggleDarkMode}
              title="Toggle theme mode"
              className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Submit Issue CTA */}
            <button
              onClick={onOpenNewComplaint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Report Problem</span>
            </button>

            {/* Enterprise Notification Bell connected to Supabase (Visible only when authenticated) */}
            {currentUser && (
              <NotificationBell
                currentUser={currentUser}
                onSelectComplaint={onSelectComplaint}
                onOpenAllNotifications={() => setActiveTab('notifications')}
              />
            )}

            {/* User Profile / Auth Button */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-slate-700 transition-all text-left"
                >
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-lg object-cover ring-2 ring-indigo-500/30"
                  />
                  <div className="hidden md:block">
                    <div className="text-xs font-semibold text-slate-200 leading-tight">{currentUser.name}</div>
                    <div className="text-[10px] text-indigo-400 font-medium">{currentUser.role}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showPersonaMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in">
                    
                    {/* User Account Info Header */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 mb-3">
                      <div className="text-xs font-bold text-slate-100">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-400">{currentUser.email}</div>
                      {currentUser.rollNo && (
                        <div className="text-[10px] text-indigo-400 font-mono font-bold mt-1">Roll: {currentUser.rollNo}</div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenProfileModal();
                          setShowPersonaMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-indigo-400" />
                        My Student Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          setShowPersonaMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/20"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
