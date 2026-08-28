import React, { useState, useEffect } from 'react';
import { User, AppNotification } from '../../types';
import { apiService } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { 
  Bell, 
  Search, 
  CheckCheck, 
  Trash2, 
  Clock, 
  ExternalLink, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  AlertCircle, 
  Wrench, 
  Key, 
  UserPlus, 
  ShieldAlert, 
  RefreshCw,
  Check,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface NotificationPageProps {
  currentUser: User | null;
  onSelectComplaint?: (complaintId: string) => void;
  onBackToDashboard: () => void;
}

export const NotificationPage: React.FC<NotificationPageProps> = ({
  currentUser,
  onSelectComplaint,
  onBackToDashboard
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const userId = currentUser?.id || null;
  const userRole = currentUser?.role || null;

  const loadNotifications = async (isInitial = false) => {
    try {
      if (isInitial || notifications.length === 0) setLoading(true);

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

      setNotifications(data);
    } catch (err) {
      console.error('Failed to load full notifications from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);

    const interval = setInterval(() => {
      loadNotifications(false);
    }, 6000);

    let subscription: any = null;
    if (isSupabaseConfigured && supabase) {
      subscription = supabase
        .channel(`realtime:notification_page:${userId || 'guest'}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            ...(userId ? { filter: `user_id=eq.${userId}` } : {})
          },
          (payload) => {
            console.log('[NotificationPage Realtime Change]:', payload);
            loadNotifications(false);
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
    return past.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleMarkAllRead = async () => {
    try {
      await apiService.markNotificationsRead(userId || undefined, userRole || undefined);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await apiService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking single as read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await apiService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Icon Helper by notification context
  const getNotificationIcon = (n: AppNotification) => {
    const titleLower = (n.title || '').toLowerCase();
    const typeLower = (n.type || '').toLowerCase();

    if (titleLower.includes('resolved') || titleLower.includes('closed') || typeLower === 'success') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
    if (titleLower.includes('rejected') || titleLower.includes('disabled') || typeLower === 'error') {
      return <AlertCircle className="w-5 h-5 text-rose-400" />;
    }
    if (titleLower.includes('assigned') || titleLower.includes('progress') || titleLower.includes('proof')) {
      return <Wrench className="w-5 h-5 text-amber-400" />;
    }
    if (titleLower.includes('password') || titleLower.includes('reset')) {
      return <Key className="w-5 h-5 text-purple-400" />;
    }
    if (titleLower.includes('staff created') || titleLower.includes('user')) {
      return <UserPlus className="w-5 h-5 text-indigo-400" />;
    }
    if (n.priority === 'Critical' || n.priority === 'High') {
      return <ShieldAlert className="w-5 h-5 text-rose-400" />;
    }
    return <Info className="w-5 h-5 text-indigo-400" />;
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'Critical':
        return <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Medium</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium uppercase rounded bg-slate-800 text-slate-400 border border-slate-700/50">Low</span>;
    }
  };

  // Filter Logic
  const filteredNotifications = notifications.filter(n => {
    if (statusFilter === 'UNREAD' && n.read) return false;
    if (statusFilter === 'READ' && !n.read) return false;
    if (priorityFilter !== 'ALL' && (n.priority || 'Medium') !== priorityFilter) return false;
    if (typeFilter !== 'ALL' && (n.type || 'info') !== typeFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const titleMatch = n.title.toLowerCase().includes(q);
      const msgMatch = n.message.toLowerCase().includes(q);
      const complaintMatch = n.complaintId ? n.complaintId.toLowerCase().includes(q) : false;
      return titleMatch || msgMatch || complaintMatch;
    }

    return true;
  });

  const unreadTotal = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Bell className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Enterprise Notification Center</h1>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                SUPABASE DB
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Complete realtime system audit notifications and alert logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>

          {unreadTotal > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All as Read ({unreadTotal})
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
        
        {/* Search */}
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Read/Unread Filter */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
              statusFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setStatusFilter('UNREAD')}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
              statusFilter === 'UNREAD' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unread ({unreadTotal})
          </button>
          <button
            onClick={() => setStatusFilter('READ')}
            className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
              statusFilter === 'READ' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Read
          </button>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">All Priorities</option>
            <option value="Critical" className="bg-slate-900 text-slate-200">Critical Priority</option>
            <option value="High" className="bg-slate-900 text-slate-200">High Priority</option>
            <option value="Medium" className="bg-slate-900 text-slate-200">Medium Priority</option>
            <option value="Low" className="bg-slate-900 text-slate-200">Low Priority</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Sparkles className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">All Alert Types</option>
            <option value="info" className="bg-slate-900 text-slate-200">Info Alerts</option>
            <option value="success" className="bg-slate-900 text-slate-200">Success Alerts</option>
            <option value="warning" className="bg-slate-900 text-slate-200">Warning Alerts</option>
            <option value="error" className="bg-slate-900 text-slate-200">Error / Critical Alerts</option>
          </select>
        </div>

      </div>

      {/* Notifications Grid / List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800/80">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">Loading notifications from Supabase...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800/80 space-y-3">
            <Bell className="w-10 h-10 text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No matching notifications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no system notification records in Supabase matching your search and filter parameters.
            </p>
          </div>
        ) : (
          filteredNotifications.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all duration-200 ${
                n.read
                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-400'
                  : 'bg-indigo-950/30 border-indigo-800/60 text-slate-100 font-medium shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                
                <div className={`p-2.5 rounded-xl border shrink-0 ${
                  n.read ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-indigo-500/40 shadow-inner'
                }`}>
                  {getNotificationIcon(n)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h3 className={`text-sm font-bold truncate ${n.read ? 'text-slate-300' : 'text-white'}`}>
                      {n.title}
                    </h3>

                    <div className="flex items-center gap-2">
                      {getPriorityBadge(n.priority)}
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {n.message}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      {n.complaintId && (
                        <button
                          type="button"
                          onClick={() => onSelectComplaint && onSelectComplaint(n.complaintId!)}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                        >
                          View Related Ticket ({n.complaintId})
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkSingleRead(n.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/20 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Mark Read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteNotification(n.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
