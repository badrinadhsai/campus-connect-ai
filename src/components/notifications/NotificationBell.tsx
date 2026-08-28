import React, { useState, useEffect, useRef } from 'react';
import { User, AppNotification } from '../../types';
import { apiService } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { 
  Bell, 
  CheckCheck, 
  Clock, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  AlertCircle, 
  Trash2, 
  ShieldAlert, 
  Wrench, 
  Key, 
  UserPlus, 
  UserX,
  Sparkles,
  ListFilter,
  Check
} from 'lucide-react';

interface NotificationBellProps {
  currentUser: User | null;
  onSelectComplaint?: (complaintId: string) => void;
  onOpenAllNotifications: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  onSelectComplaint,
  onOpenAllNotifications
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNewArrived, setIsNewArrived] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userId = currentUser?.id || null;
  const userRole = currentUser?.role || null;

  // Helper for Time Ago formatting
  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    const now = new Date();
    const past = new Date(dateStr);
    const diffInSec = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSec < 10) return 'Just now';
    if (diffInSec < 60) return `${diffInSec}s ago`;
    const diffInMin = Math.floor(diffInSec / 60);
    if (diffInMin < 60) return `${diffInMin}m ago`;
    const diffInHrs = Math.floor(diffInMin / 60);
    if (diffInHrs < 24) return `${diffInHrs}h ago`;
    const diffInDays = Math.floor(diffInHrs / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return past.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const fetchNotifications = async (isInitial = false) => {
    try {
      if (isInitial || notifications.length === 0) setLoading(true);

      // Retrieve effective auth uid if available from session
      let effectiveId = userId;
      if (isSupabaseConfigured && supabase) {
        const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        if (authData?.user?.id) {
          effectiveId = authData.user.id;
        }
      }

      const data = await apiService.getNotifications(effectiveId || userId || undefined, userRole || undefined);
      
      const targetAuthId = effectiveId || userId || 'none';
      console.log('auth.user.id:', targetAuthId);
      console.log('Current Auth User ID:', targetAuthId);
      console.log('Fetched Notification Count:', data.length);
      console.log('Notification User IDs:', data.map(n => n.userId));

      // Check if new unread notification arrived
      const prevUnreadIds = new Set(notifications.filter(n => !n.read).map(n => n.id));
      const currentUnread = data.filter(n => !n.read);
      const hasNew = currentUnread.some(n => !prevUnreadIds.has(n.id));
      
      if (hasNew && notifications.length > 0) {
        setIsNewArrived(true);
        setTimeout(() => setIsNewArrived(false), 3000);
      }

      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    // 1. Polling fallback every 6 seconds
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 6000);

    // 2. Supabase Realtime Subscription
    let subscription: any = null;
    if (isSupabaseConfigured && supabase) {
      subscription = supabase
        .channel(`realtime:notifications:${userId || 'guest'}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications', 
            ...(userId ? { filter: `user_id=eq.${userId}` } : {})
          },
          (payload) => {
            console.log('[Supabase Realtime Notification Change]:', payload);
            fetchNotifications(false);
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (subscription && supabase) {
        supabase.removeChannel(subscription);
      }
    };
  }, [userId, userRole]);

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      await apiService.markNotificationsRead(userId || undefined, userRole || undefined);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleMarkSingleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark single read:', err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) {
      apiService.markNotificationAsRead(n.id).catch(console.error);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
    }
    if (n.complaintId && onSelectComplaint) {
      onSelectComplaint(n.complaintId);
      setIsOpen(false);
    }
  };

  // Icon Helper by notification context
  const getNotificationIcon = (n: AppNotification) => {
    const titleLower = (n.title || '').toLowerCase();
    const typeLower = (n.type || '').toLowerCase();

    if (titleLower.includes('resolved') || titleLower.includes('closed') || typeLower === 'success') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
    if (titleLower.includes('rejected') || titleLower.includes('disabled') || typeLower === 'error') {
      return <AlertCircle className="w-4 h-4 text-rose-400" />;
    }
    if (titleLower.includes('assigned') || titleLower.includes('progress') || titleLower.includes('proof')) {
      return <Wrench className="w-4 h-4 text-amber-400" />;
    }
    if (titleLower.includes('password') || titleLower.includes('reset')) {
      return <Key className="w-4 h-4 text-purple-400" />;
    }
    if (titleLower.includes('staff created') || titleLower.includes('user')) {
      return <UserPlus className="w-4 h-4 text-indigo-400" />;
    }
    if (n.priority === 'Critical' || n.priority === 'High') {
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    }
    return <Info className="w-4 h-4 text-indigo-400" />;
  };

  // Priority Badge style
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'Critical':
        return <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Critical</span>;
      case 'High':
        return <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">High</span>;
      case 'Medium':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Medium</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase rounded bg-slate-800 text-slate-400 border border-slate-700/50">Low</span>;
    }
  };

  const displayedNotifications = notifications.slice(0, 20);

  if (!currentUser) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications Center"
        className={`relative p-2 rounded-xl border transition-all duration-200 ${
          isOpen 
            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/20' 
            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700'
        }`}
      >
        <Bell className={`w-4 h-4 transition-transform duration-300 ${isNewArrived ? 'animate-bounce text-indigo-400' : ''}`} />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-md ring-2 ring-slate-950 transition-all ${isNewArrived ? 'scale-125 bg-amber-500' : ''}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Green Dot Indicator when unread notifications exist */}
        {unreadCount > 0 && (
          <span className="absolute bottom-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-100">Notification Center</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    REALTIME
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Direct Supabase system updates</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2 py-1 rounded-lg transition-colors font-medium border border-indigo-500/20"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List Body */}
          <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            {displayedNotifications.length === 0 ? (
              <div className="text-center py-8 px-4 text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-slate-700 mx-auto" />
                <div className="text-xs font-medium text-slate-400">All caught up!</div>
                <p className="text-[11px] text-slate-600">No system notifications found in Supabase.</p>
              </div>
            ) : (
              displayedNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative p-3 rounded-xl border text-xs transition-all duration-200 cursor-pointer ${
                    n.read
                      ? 'bg-slate-950/40 border-slate-800/50 text-slate-400 hover:bg-slate-900 hover:border-slate-700'
                      : 'bg-indigo-950/30 border-indigo-800/50 text-slate-200 font-medium hover:bg-indigo-900/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    
                    {/* Context Icon */}
                    <div className={`p-2 rounded-lg border mt-0.5 shrink-0 ${
                      n.read ? 'bg-slate-900 border-slate-800' : 'bg-slate-900 border-indigo-500/30'
                    }`}>
                      {getNotificationIcon(n)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`font-semibold truncate ${n.read ? 'text-slate-300' : 'text-slate-100 font-bold'}`}>
                          {n.title}
                        </span>
                      </div>

                      <p className="text-[11px] leading-relaxed text-slate-300 line-clamp-2 mb-2">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{getTimeAgo(n.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {getPriorityBadge(n.priority)}
                          {n.complaintId && (
                            <span className="flex items-center gap-0.5 text-[10px] text-indigo-400 font-semibold hover:underline">
                              View <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Overlay Icons */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkSingleRead(n.id, e)}
                          title="Mark as read"
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotification(n.id, e)}
                        title="Delete notification"
                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer CTA */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Showing max 20 latest
            </span>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenAllNotifications();
              }}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
            >
              View All Notifications
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
