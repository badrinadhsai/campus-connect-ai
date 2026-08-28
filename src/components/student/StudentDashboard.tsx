import React, { useState, useEffect, useCallback } from 'react';
import { Complaint, User, ComplaintCategory, ComplaintStatus, ComplaintPriority } from '../../types';
import { apiService } from '../../services/api';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ThumbsUp, 
  MapPin, 
  ArrowUpDown,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Calendar,
  UserCheck,
  Tag,
  MessageSquare
} from 'lucide-react';

interface StudentDashboardProps {
  currentUser: User | null;
  onOpenNewComplaint: () => void;
  onSelectComplaint: (complaint: Complaint) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  onOpenNewComplaint,
  onSelectComplaint
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'upvotes'>('newest');

  const student = currentUser || {
    id: 'guest-student',
    name: 'Student',
    email: 'student@campus.edu',
    role: 'STUDENT' as const,
    rollNo: '211FA04001',
    branch: 'CSE',
    year: '4th Year',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    phone: '',
    createdAt: new Date().toISOString()
  };

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getComplaints({
        role: 'STUDENT',
        userId: student.id,
        userEmail: student.email
      });
      setComplaints(data || []);
    } catch (err: any) {
      console.error('[StudentDashboard] Error fetching complaints:', err);
      setError(err?.message || 'Failed to fetch complaints from database.');
    } finally {
      setLoading(false);
    }
  }, [student.id, student.email]);

  useEffect(() => {
    fetchComplaints();

    const handleAutoRefresh = () => {
      console.log('[StudentDashboard] Refreshing complaint list on creation/update event...');
      fetchComplaints();
    };

    window.addEventListener('complaint-created', handleAutoRefresh);
    window.addEventListener('complaint-updated', handleAutoRefresh);

    return () => {
      window.removeEventListener('complaint-created', handleAutoRefresh);
      window.removeEventListener('complaint-updated', handleAutoRefresh);
    };
  }, [fetchComplaints]);

  // Overall KPI counts for all logged-in student's complaints
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review' || c.status === 'Assigned').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;

  // Filter complaints for list view
  const filteredComplaints = complaints.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchId = (c.complaintId || c.id).toLowerCase().includes(q);
      const matchLoc = (c.location || '').toLowerCase().includes(q);
      const matchCat = (c.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchId && !matchLoc && !matchCat) return false;
    }
    if (selectedCategory !== 'ALL' && selectedCategory !== 'All') {
      if (c.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }
    if (selectedStatus !== 'ALL' && selectedStatus !== 'All') {
      if (c.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    }
    if (selectedPriority !== 'ALL' && selectedPriority !== 'All') {
      if (c.priority.toLowerCase() !== selectedPriority.toLowerCase()) return false;
    }
    return true;
  });

  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    if (sortBy === 'upvotes') return (b.upvotes || 0) - (a.upvotes || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Student Academic Profile Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/60 border border-slate-800/90 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Student Profile Overview */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt={student.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-xl"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold" title="Verified Active Student">
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100">Welcome, {student.name}</h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  B.Tech {student.branch || student.department || 'CSE'}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {student.year || '4th Year'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <p className="flex items-center gap-1 font-mono text-indigo-300 font-semibold">
                  <span className="text-slate-500 font-normal">Roll No:</span> {student.rollNo || 'STD-2026'}
                </p>
                <p className="flex items-center gap-1">
                  <span className="text-slate-500">Email:</span> {student.email}
                </p>
                {student.phone && (
                  <p className="flex items-center gap-1">
                    <span className="text-slate-500">Phone:</span> {student.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* New Complaint CTA */}
          <button
            onClick={onOpenNewComplaint}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Report New Campus Problem
          </button>

        </div>
      </div>

      {/* Database Error Banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Database Error: {error}</span>
          </div>
          <button
            onClick={() => fetchComplaints()}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-xs border border-rose-500/30 transition-colors shrink-0 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-blue-950/30 border border-slate-800 hover:border-blue-500/30 transition-all shadow-xl group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
            <span className="text-slate-300">Total Reported</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all border border-blue-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-100 tracking-tight">{totalCount}</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
              Active Queue
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block animate-pulse"></span>
            Campus tickets logged
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/30 border border-slate-800 hover:border-purple-500/30 transition-all shadow-xl group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
            <span className="text-slate-300">Pending Review</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all border border-purple-500/20">
              <RefreshCw className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-purple-400 tracking-tight">{pendingCount}</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Awaiting
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
            Assigned to dispatch
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-amber-950/30 border border-slate-800 hover:border-amber-500/30 transition-all shadow-xl group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
            <span className="text-slate-300">In Progress</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all border border-amber-500/20">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-amber-400 tracking-tight">{inProgressCount}</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Active Work
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-ping"></span>
            Technician on site
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/30 border border-slate-800 hover:border-emerald-500/30 transition-all shadow-xl group">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
            <span className="text-slate-300">Resolved</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-emerald-400 tracking-tight">{resolvedCount}</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Fixed
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            Resolution completed
          </p>
        </div>

      </div>

      {/* Recent Activity Timeline Widget */}
      {complaints.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Recent Activity Timeline</h3>
            </div>
            <span className="text-[11px] text-slate-400">Live Updates</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {complaints.slice(0, 3).map((item) => {
              const progressPct = 
                item.status === 'Resolved' || item.status === 'Closed' ? 100 :
                item.status === 'In Progress' ? 75 :
                item.status === 'Assigned' ? 50 :
                item.status === 'Under Review' ? 25 : 10;

              return (
                <div 
                  key={item.id} 
                  onClick={() => onSelectComplaint(item)}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-indigo-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {item.complaintId || item.id}
                    </span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 line-clamp-1 transition-colors">
                    {item.title}
                  </h4>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Status Progress</span>
                      <span className="font-mono font-semibold text-indigo-300">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by ticket ID, title, building, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Classroom">Classroom</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Library">Library</option>
              <option value="Wi-Fi">Wi-Fi</option>
              <option value="Hostel">Hostel</option>
              <option value="Mess">Mess</option>
              <option value="Electricity">Electricity</option>
              <option value="Water">Water</option>
              <option value="Washroom">Washroom</option>
              <option value="Lost & Found">Lost & Found</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <button
              onClick={() => setSortBy(sortBy === 'newest' ? 'upvotes' : 'newest')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 hover:border-slate-700 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              {sortBy === 'newest' ? 'Newest First' : 'Most Upvoted'}
            </button>

          </div>

        </div>
      </div>

      {/* Complaints List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-slate-800 rounded-full" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-slate-800 rounded-full" />
                  <div className="h-5 w-16 bg-slate-800 rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-slate-800 rounded" />
                <div className="h-3 w-full bg-slate-800/60 rounded" />
                <div className="h-3 w-5/6 bg-slate-800/60 rounded" />
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center">
                <div className="h-3 w-28 bg-slate-800 rounded" />
                <div className="h-3 w-20 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedComplaints.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center space-y-3 bg-slate-900/40">
          <SlidersHorizontal className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">You haven't submitted any complaints yet.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">No problem reports found matching your criteria. Be the first to report an infrastructure or campus maintenance issue.</p>
          <button
            onClick={onOpenNewComplaint}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            Report Problem Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedComplaints.map(c => {
            const formattedDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : 'Recently';

            return (
              <div
                key={c.id}
                onClick={() => onSelectComplaint(c)}
                className="group p-5 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Ticket ID & Status / Priority */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                        {c.complaintId || c.id}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-700/80">
                        <Tag className="w-3 h-3 text-indigo-400" />
                        {c.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.status} size="sm" />
                      <PriorityBadge priority={c.priority} size="sm" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">
                    {c.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {c.description}
                  </p>

                  {/* Assigned Staff & Latest Staff Remarks */}
                  {c.assignedStaffName && (
                    <div className="mb-2.5 px-2.5 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Assigned Staff: <strong className="text-slate-100">{c.assignedStaffName}</strong></span>
                      </div>
                      {c.assignedDepartment && (
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md font-medium">
                          {c.assignedDepartment}
                        </span>
                      )}
                    </div>
                  )}

                  {(c.resolutionRemarks || c.rejectionReason) && (
                    <div className="mb-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                      <div className="flex items-center gap-1 font-semibold text-amber-400 mb-0.5">
                        <MessageSquare className="w-3 h-3" />
                        <span>Latest Staff Remarks:</span>
                      </div>
                      <p className="text-slate-300 italic line-clamp-2">
                        "{c.resolutionRemarks || c.rejectionReason}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Location, Updated Date & Upvotes */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-[150px]">{c.location}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>Updated {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : formattedDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-400 font-semibold">
                      <ThumbsUp className="w-3.5 h-3.5 text-indigo-400" />
                      {c.upvotes || 1}
                    </span>
                    <span className="flex items-center gap-1 text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      <Eye className="w-3.5 h-3.5" /> View
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

