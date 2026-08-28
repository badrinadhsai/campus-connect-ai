import React, { useState, useEffect } from 'react';
import { User, Complaint } from './types';
import { apiService } from './services/api';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { StudentDashboard } from './components/student/StudentDashboard';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { NotificationPage } from './components/notifications/NotificationPage';
import { NewComplaintModal } from './components/student/NewComplaintModal';
import { ComplaintDetailModal } from './components/student/ComplaintDetailModal';
import { DocsAndSchemaModal } from './components/docs/DocsAndSchemaModal';
import { AuthPage } from './components/auth/AuthPage';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/auth/ProfileModal';
import { supabase } from './lib/supabase';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('login');
  const [isNewComplaintOpen, setIsNewComplaintOpen] = useState<boolean>(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Auth & Profile Modals
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check Supabase session first if available
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const email = session.user.email || '';
          apiService.getCurrentUser(session.user.id).then(user => {
            if (user) {
              setCurrentUser(user);
              if (user.role === 'STUDENT') setActiveTab('student');
              else if (user.role === 'STAFF') setActiveTab('staff');
              else if (user.role === 'ADMIN') setActiveTab('admin');
            }
          }).catch(() => {
            // Fallback user construction from metadata
            const fallbackUser: User = {
              id: session.user.id,
              name: session.user.user_metadata?.full_name || email.split('@')[0] || 'Student',
              email,
              role: (session.user.user_metadata?.role as any) || 'STUDENT',
              department: session.user.user_metadata?.branch || 'CSE',
              rollNo: session.user.user_metadata?.roll_no || 'STD-2026',
              branch: session.user.user_metadata?.branch || 'CSE',
              year: session.user.user_metadata?.year || '4th Year',
              phone: session.user.user_metadata?.phone || '',
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email || 'Student')}`,
              createdAt: new Date().toISOString()
            };
            setCurrentUser(fallbackUser);
            if (fallbackUser.role === 'STUDENT') setActiveTab('student');
            else if (fallbackUser.role === 'STAFF') setActiveTab('staff');
            else if (fallbackUser.role === 'ADMIN') setActiveTab('admin');
          });
        }
      });
    }
  }, []);

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
  };

  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setSessionToken(token);

    // Redirect to Student Dashboard (or matching role dashboard)
    if (user.role === 'STUDENT') setActiveTab('student');
    else if (user.role === 'STAFF') setActiveTab('staff');
    else if (user.role === 'ADMIN') setActiveTab('admin');
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(e => console.warn('Supabase signout note:', e));
    }
    setCurrentUser(null);
    setSessionToken(null);
    setActiveTab('login');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleSelectComplaintById = async (complaintId: string) => {
    try {
      const complaint = await apiService.getComplaint(complaintId);
      if (complaint) {
        setSelectedComplaint(complaint);
      }
    } catch (err) {
      console.error('Failed to fetch complaint for notification link:', err);
    }
  };

  return (
    <ToastProvider>
      <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'}`}>
        
        {/* Navigation Bar */}
        <Navbar
          currentRole={currentUser ? currentUser.role : 'STUDENT'}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onLogout={handleLogout}
          onOpenAuthModal={() => setIsAuthOpen(true)}
          onOpenProfileModal={() => setIsProfileOpen(true)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenNewComplaint={() => {
            if (!currentUser) {
              setIsAuthOpen(true);
            } else {
              setIsNewComplaintOpen(true);
            }
          }}
          onOpenDocs={() => setIsDocsOpen(true)}
          onSelectComplaint={handleSelectComplaintById}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />

        {/* Main Content Body */}
        <main className="pb-16 pt-4">
          {activeTab === 'login' && !currentUser && (
            <AuthPage onLoginSuccess={handleLoginSuccess} />
          )}

          {(activeTab === 'student' || (activeTab === 'login' && currentUser?.role === 'STUDENT')) && (
            <StudentDashboard
              currentUser={currentUser}
              onOpenNewComplaint={() => {
                if (!currentUser) setIsAuthOpen(true);
                else setIsNewComplaintOpen(true);
              }}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
            />
          )}

          {activeTab === 'staff' && (
            (currentUser?.role === 'STAFF' || currentUser?.role === 'ADMIN') ? (
              <StaffDashboard
                currentUser={currentUser}
                onSelectComplaint={(c) => setSelectedComplaint(c)}
              />
            ) : (
              <div className="max-w-4xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl border border-rose-500/20">
                  🔒
                </div>
                <h2 className="text-xl font-bold text-slate-100">Access Restricted</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  The Staff Workspace is reserved for designated maintenance staff and department resolution teams.
                </p>
                <button
                  onClick={() => setActiveTab('student')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20"
                >
                  Return to Student Portal
                </button>
              </div>
            )
          )}

          {activeTab === 'admin' && (
            currentUser?.role === 'ADMIN' ? (
              <AdminDashboard
                currentUser={currentUser}
                onSelectComplaint={(c) => setSelectedComplaint(c)}
              />
            ) : (
              <div className="max-w-4xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl border border-rose-500/20">
                  🔒
                </div>
                <h2 className="text-xl font-bold text-slate-100">Administrator Access Required</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  The Admin Command Center is strictly restricted to authorized campus system administrators.
                </p>
                <button
                  onClick={() => setActiveTab('student')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20"
                >
                  Return to Student Portal
                </button>
              </div>
            )
          )}

          {activeTab === 'analytics' && (
            (currentUser?.role === 'STAFF' || currentUser?.role === 'ADMIN') ? (
              <AnalyticsDashboard />
            ) : (
              <div className="max-w-4xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl border border-rose-500/20">
                  🔒
                </div>
                <h2 className="text-xl font-bold text-slate-100">Analytics Access Restricted</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Executive analytics and departmental resolution metrics are available to authorized staff and administrators only.
                </p>
                <button
                  onClick={() => setActiveTab('student')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20"
                >
                  Return to Student Portal
                </button>
              </div>
            )
          )}
          {activeTab === 'notifications' && (
            <NotificationPage
              currentUser={currentUser}
              onSelectComplaint={handleSelectComplaintById}
              onBackToDashboard={() => {
                if (currentUser?.role === 'ADMIN') setActiveTab('admin');
                else if (currentUser?.role === 'STAFF') setActiveTab('staff');
                else setActiveTab('student');
              }}
            />
          )}
        </main>

        {/* Footer */}
        <Footer onOpenDocs={() => setIsDocsOpen(true)} />

        {/* Modals */}
        {isNewComplaintOpen && (
          <NewComplaintModal
            currentUser={currentUser}
            isOpen={isNewComplaintOpen}
            onClose={() => setIsNewComplaintOpen(false)}
            onSuccess={() => {
              setIsNewComplaintOpen(false);
              window.dispatchEvent(new Event('complaint-created'));
            }}
          />
        )}

        {selectedComplaint && (
          <ComplaintDetailModal
            complaint={selectedComplaint}
            currentUser={currentUser}
            onClose={() => setSelectedComplaint(null)}
            onUpdate={() => {
              window.dispatchEvent(new Event('complaint-updated'));
            }}
          />
        )}

        {isDocsOpen && (
          <DocsAndSchemaModal
            isOpen={isDocsOpen}
            onClose={() => setIsDocsOpen(false)}
          />
        )}

        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {isProfileOpen && currentUser && (
          <ProfileModal
            isOpen={isProfileOpen}
            currentUser={currentUser}
            onClose={() => setIsProfileOpen(false)}
            onUpdateUser={handleUpdateUser}
          />
        )}

      </div>
    </ToastProvider>
  );
}
