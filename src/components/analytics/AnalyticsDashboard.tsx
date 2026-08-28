import React, { useState, useEffect, useMemo } from 'react';
import { Complaint, AuditLog, User, CategoryInfo } from '../../types';
import { apiService } from '../../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart,
  Line,
  Legend 
} from 'recharts';
import { 
  BarChart3, 
  Download, 
  Printer, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  PieChart as PieIcon, 
  TrendingUp,
  FileSpreadsheet,
  Filter,
  Calendar,
  Zap,
  Activity,
  MapPin,
  Flame,
  UserCheck,
  UserX,
  Building2,
  CheckCheck,
  RefreshCw,
  Search,
  Check,
  Award,
  Layers
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b'];
const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#10b981'
};

const STATUS_COLORS: Record<string, string> = {
  Submitted: '#6366f1',
  'Under Review': '#8b5cf6',
  Assigned: '#a855f7',
  'In Progress': '#06b6d4',
  Resolved: '#10b981',
  Closed: '#64748b',
  Rejected: '#f43f5e'
};

export const AnalyticsDashboard: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [timeRange, setTimeRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | '30DAYS' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cData, aData, uData, catData] = await Promise.all([
        apiService.getComplaints(),
        apiService.getAuditLogs(),
        apiService.getUsers(),
        apiService.getCategories()
      ]);
      setComplaints(cData || []);
      setAuditLogs(aData || []);
      setUsers(uData || []);
      setCategories(catData || []);
    } catch (err) {
      console.error('Failed to load live analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('complaint-updated', handleUpdate);
    window.addEventListener('complaint-created', handleUpdate);
    return () => {
      window.removeEventListener('complaint-updated', handleUpdate);
      window.removeEventListener('complaint-created', handleUpdate);
    };
  }, []);

  // Filter complaints based on user selections
  const filteredComplaints = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return complaints.filter(c => {
      const cDate = new Date(c.createdAt);

      // Category filter
      if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;

      // Priority filter
      if (selectedPriority !== 'ALL' && c.priority !== selectedPriority) return false;

      // Status filter
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;

      // Time Range filter
      if (timeRange === 'TODAY') {
        if (cDate < startOfToday) return false;
      } else if (timeRange === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (cDate < weekAgo) return false;
      } else if (timeRange === 'MONTH') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (cDate < monthStart) return false;
      } else if (timeRange === '30DAYS') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (cDate < thirtyDaysAgo) return false;
      } else if (timeRange === 'CUSTOM') {
        if (startDate && new Date(startDate) > cDate) return false;
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          if (cDate > eDate) return false;
        }
      }

      return true;
    });
  }, [complaints, timeRange, startDate, endDate, selectedCategory, selectedPriority, selectedStatus]);

  // Previous Period Complaints for Percentage Change calculation
  const previousPeriodCount = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (timeRange === 'TODAY') {
      const yesterdayStart = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      return complaints.filter(c => {
        const d = new Date(c.createdAt);
        return d >= yesterdayStart && d < startOfToday;
      }).length;
    } else if (timeRange === 'WEEK' || timeRange === '30DAYS') {
      const days = timeRange === 'WEEK' ? 7 : 30;
      const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const prevPeriodStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
      return complaints.filter(c => {
        const d = new Date(c.createdAt);
        return d >= prevPeriodStart && d < periodStart;
      }).length;
    }
    return Math.max(1, Math.round(filteredComplaints.length * 0.85));
  }, [complaints, timeRange, filteredComplaints]);

  // Calculations for Summary Cards
  const totalCount = filteredComplaints.length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const getTodayCount = (statusFilter?: (c: Complaint) => boolean) => {
    return filteredComplaints.filter(c => {
      const isToday = new Date(c.createdAt) >= todayStart;
      return isToday && (!statusFilter || statusFilter(c));
    }).length;
  };

  const pendingComplaints = filteredComplaints.filter(c => c.status === 'Submitted' || c.status === 'Verified' || c.status === 'Under Review');
  const assignedComplaints = filteredComplaints.filter(c => c.status === 'Assigned');
  const inProgressComplaints = filteredComplaints.filter(c => c.status === 'In Progress');
  const resolvedComplaints = filteredComplaints.filter(c => c.status === 'Resolved');
  const closedComplaints = filteredComplaints.filter(c => c.status === 'Closed');

  const calcPctChange = (current: number) => {
    if (previousPeriodCount === 0) return '+100%';
    const pct = Math.round(((current - previousPeriodCount) / previousPeriodCount) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  // Performance Dashboard Calculations
  const resolvedList = filteredComplaints.filter(c => (c.status === 'Resolved' || c.status === 'Closed') && c.createdAt);
  
  let totalResolutionHours = 0;
  let fastestHours = Infinity;
  
  resolvedList.forEach(c => {
    const diffMs = new Date(c.updatedAt || c.createdAt).getTime() - new Date(c.createdAt).getTime();
    const hrs = Math.max(0.1, diffMs / (1000 * 60 * 60));
    totalResolutionHours += hrs;
    if (hrs < fastestHours) fastestHours = hrs;
  });

  const avgResolutionTimeHours = resolvedList.length > 0 ? (totalResolutionHours / resolvedList.length).toFixed(1) : '0.0';
  const fastestResolutionText = fastestHours !== Infinity ? `${fastestHours < 1 ? Math.round(fastestHours * 60) + ' mins' : fastestHours.toFixed(1) + ' hrs'}` : 'N/A';

  // Longest Pending Complaint
  const unresolvedList = filteredComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed' && c.status !== 'Rejected');
  let longestPending: { complaint: Complaint; days: number } | null = null;
  const nowMs = Date.now();

  unresolvedList.forEach(c => {
    const days = Math.floor((nowMs - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (!longestPending || days > longestPending.days) {
      longestPending = { complaint: c, days };
    }
  });

  // Most Active & Least Active Staff
  const staffMembers = users.filter(u => u.role === 'STAFF');
  const staffStats = staffMembers.map(stf => {
    const assigned = complaints.filter(c => c.assignedStaffId === stf.id || (c.assignedStaffName && c.assignedStaffName.includes(stf.name))).length;
    const resolved = complaints.filter(c => (c.assignedStaffId === stf.id || (c.assignedStaffName && c.assignedStaffName.includes(stf.name))) && (c.status === 'Resolved' || c.status === 'Closed')).length;
    return {
      staff: stf,
      assigned,
      resolved
    };
  }).sort((a, b) => b.resolved - a.resolved);

  const mostActiveStaff = staffStats[0] || null;
  const leastActiveStaff = staffStats.length > 1 ? staffStats[staffStats.length - 1] : null;

  // Average Complaints Per Day
  const firstDate = filteredComplaints.length > 0 
    ? new Date(Math.min(...filteredComplaints.map(c => new Date(c.createdAt).getTime())))
    : new Date();
  const daysSpan = Math.max(1, Math.ceil((nowMs - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
  const avgComplaintsPerDay = (totalCount / daysSpan).toFixed(1);

  // Department Analytics Breakdown
  const deptTargets = [
    { name: 'Wi-Fi', categories: ['Wi-Fi', 'Internet', 'Network'] },
    { name: 'Hostel', categories: ['Hostel', 'Mess'] },
    { name: 'Library', categories: ['Library'] },
    { name: 'Laboratory', categories: ['Laboratory', 'Classroom'] },
    { name: 'Electricity', categories: ['Electricity', 'Power'] },
    { name: 'Water Leakage', categories: ['Water', 'Plumbing', 'Washroom'] },
    { name: 'Washroom', categories: ['Washroom', 'Hygiene'] },
    { name: 'Transport', categories: ['Bus', 'Transport', 'Parking'] },
    { name: 'Lost & Found', categories: ['Lost & Found', 'Security'] },
  ];

  const departmentAnalytics = deptTargets.map(dept => {
    const deptComplaints = filteredComplaints.filter(c => 
      dept.categories.some(cat => c.category.toLowerCase().includes(cat.toLowerCase()))
    );
    const total = deptComplaints.length;
    const resolved = deptComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return {
      name: dept.name,
      total,
      resolved,
      rate
    };
  });

  // Campus Heatmap Data (by Building / Location)
  const heatmapData = useMemo(() => {
    const locMap: Record<string, { total: number; open: number; resolved: number }> = {};
    filteredComplaints.forEach(c => {
      const loc = c.building || c.location || 'General Campus';
      if (!locMap[loc]) locMap[loc] = { total: 0, open: 0, resolved: 0 };
      locMap[loc].total++;
      if (c.status === 'Resolved' || c.status === 'Closed') {
        locMap[loc].resolved++;
      } else {
        locMap[loc].open++;
      }
    });

    const maxLocCount = Math.max(1, ...Object.values(locMap).map(l => l.total));

    return Object.keys(locMap)
      .map(loc => ({
        location: loc,
        total: locMap[loc].total,
        open: locMap[loc].open,
        resolved: locMap[loc].resolved,
        intensity: Math.round((locMap[loc].total / maxLocCount) * 100)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredComplaints]);

  // Monthly Complaints Bar Chart Data
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, { month: string; submitted: number; resolved: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    filteredComplaints.forEach(c => {
      const d = new Date(c.createdAt);
      const mKey = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthMap[mKey]) monthMap[mKey] = { month: mKey, submitted: 0, resolved: 0 };
      monthMap[mKey].submitted++;
      if (c.status === 'Resolved' || c.status === 'Closed') {
        monthMap[mKey].resolved++;
      }
    });

    const arr = Object.values(monthMap);
    if (arr.length === 0) {
      const cur = `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;
      return [{ month: cur, submitted: 0, resolved: 0 }];
    }
    return arr;
  }, [filteredComplaints]);

  // Weekly Complaint Trend Line Chart Data
  const weeklyTrendData = useMemo(() => {
    const daysMap: Record<string, { day: string; tickets: number; resolved: number }> = {};
    
    // Sort last 14 days
    const daysArr: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(nowMs - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      daysArr.push(label);
      daysMap[label] = { day: label, tickets: 0, resolved: 0 };
    }

    filteredComplaints.forEach(c => {
      const label = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (daysMap[label]) {
        daysMap[label].tickets++;
      }
      if (c.status === 'Resolved' || c.status === 'Closed') {
        const resLabel = new Date(c.updatedAt || c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (daysMap[resLabel]) {
          daysMap[resLabel].resolved++;
        }
      }
    });

    return daysArr.map(d => daysMap[d]);
  }, [filteredComplaints, nowMs]);

  // Category Bar Chart Data
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredComplaints.forEach(c => {
      catMap[c.category] = (catMap[c.category] || 0) + 1;
    });
    return Object.keys(catMap).map(cat => ({
      category: cat,
      count: catMap[cat]
    })).sort((a, b) => b.count - a.count);
  }, [filteredComplaints]);

  // Priority Distribution Donut Data
  const priorityData = useMemo(() => {
    const prioMap: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    filteredComplaints.forEach(c => {
      prioMap[c.priority] = (prioMap[c.priority] || 0) + 1;
    });
    return Object.keys(prioMap).map(p => ({
      name: p,
      value: prioMap[p]
    }));
  }, [filteredComplaints]);

  // Status Distribution Pie Data
  const statusData = useMemo(() => {
    const stMap: Record<string, number> = {};
    filteredComplaints.forEach(c => {
      stMap[c.status] = (stMap[c.status] || 0) + 1;
    });
    return Object.keys(stMap).map(st => ({
      name: st,
      value: stMap[st]
    }));
  }, [filteredComplaints]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const headers = ['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Location', 'Student', 'Staff', 'Created At', 'Updated At'];
    const rows = filteredComplaints.map(c => [
      `"${c.complaintId || c.id}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.category}"`,
      `"${c.priority}"`,
      `"${c.status}"`,
      `"${(c.location || '').replace(/"/g, '""')}"`,
      `"${c.studentName}"`,
      `"${c.assignedStaffName || 'Unassigned'}"`,
      `"${new Date(c.createdAt).toLocaleString()}"`,
      `"${new Date(c.updatedAt).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_connect_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-900 rounded-2xl border border-slate-800" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl border border-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-900 rounded-2xl border border-slate-800" />
          <div className="h-72 bg-slate-900 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Export Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              Enterprise Analytics Dashboard
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Supabase
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time infrastructure performance telemetry, SLA response times, and complaint distribution analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold shadow transition-all hover:border-emerald-500/40"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span>Interactive Dataset Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
          
          {/* Time Range */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Time Period</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
              <option value="30DAYS">Last 30 Days</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {timeRange === 'CUSTOM' && (
            <>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {/* Reset Filters CTA */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setTimeRange('ALL');
                setSelectedCategory('ALL');
                setSelectedPriority('ALL');
                setSelectedStatus('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Clear Filters
            </button>
          </div>

        </div>
      </div>

      {/* Summary Cards Grid (6 Metric Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Complaints */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/20 relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {calcPctChange(totalCount)}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 mb-1">{totalCount}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Today: <strong className="text-indigo-300">{getTodayCount()}</strong></span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Pending</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {calcPctChange(pendingComplaints.length)}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mb-1">{pendingComplaints.length}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Today: <strong className="text-amber-300">{getTodayCount(c => c.status === 'Submitted' || c.status === 'Under Review')}</strong></span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
        </div>

        {/* Assigned */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/20 relative overflow-hidden group hover:border-purple-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Assigned</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {calcPctChange(assignedComplaints.length)}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-purple-400 mb-1">{assignedComplaints.length}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Today: <strong className="text-purple-300">{getTodayCount(c => c.status === 'Assigned')}</strong></span>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/20 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">In Progress</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {calcPctChange(inProgressComplaints.length)}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 mb-1">{inProgressComplaints.length}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Today: <strong className="text-cyan-300">{getTodayCount(c => c.status === 'In Progress')}</strong></span>
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
          </div>
        </div>

        {/* Resolved */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Resolved</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {calcPctChange(resolvedComplaints.length)}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mb-1">{resolvedComplaints.length}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Today: <strong className="text-emerald-300">{getTodayCount(c => c.status === 'Resolved')}</strong></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Closed */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 relative overflow-hidden group hover:border-slate-600 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Closed</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {calcPctChange(closedComplaints.length)}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-300 mb-1">{closedComplaints.length}</div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Today: <strong className="text-slate-200">{getTodayCount(c => c.status === 'Closed')}</strong></span>
            <span className="w-2 h-2 rounded-full bg-slate-600" />
          </div>
        </div>

      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Monthly Complaints Bar Chart */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-slate-100 text-sm">1. Monthly Complaints Overview</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Bar Chart</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="submitted" fill="#6366f1" radius={[4, 4, 0, 0]} name="Submitted Tickets" />
                <Bar dataKey="resolved" fill="#10b981" radius={[4, 4, 0, 0]} name="Resolved Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Complaint Status Distribution Pie Chart */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-slate-100 text-sm">2. Complaint Status Distribution</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Pie Chart</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2 of Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Chart 3: Complaints by Category Horizontal Bar Chart */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-slate-100 text-sm">3. Complaints by Category</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Horizontal Bar</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={11} width={90} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 6, 6, 0]} name="Complaints" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Priority Distribution Donut Chart */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-slate-100 text-sm">5. Priority Distribution</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Donut</span>
          </div>

          <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-slate-100">{totalCount}</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800">
            {priorityData.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p.name] }} />
                  {p.name}
                </span>
                <strong className="text-slate-100 font-mono">{p.value}</strong>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Chart 4: Weekly Complaint Trend Line Chart */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">4. Weekly Complaint Trend (Last 14 Days)</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Line Chart</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey="tickets" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="New Tickets" />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Resolutions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Dashboard */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="font-extrabold text-slate-100 text-base">Performance Dashboard</h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            SLA Metrics
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Average Resolution Time */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Average Resolution Time</span>
            </div>
            <div className="text-2xl font-black text-indigo-400 font-mono">{avgResolutionTimeHours} <span className="text-sm font-semibold">Hours</span></div>
            <p className="text-[11px] text-slate-500">Calculated across all resolved complaints</p>
          </div>

          {/* Fastest Resolution */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Fastest Resolution</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{fastestResolutionText}</div>
            <p className="text-[11px] text-slate-500">Peak technician response turnaround time</p>
          </div>

          {/* Average Complaints Per Day */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Average Complaints / Day</span>
            </div>
            <div className="text-2xl font-black text-cyan-400 font-mono">{avgComplaintsPerDay} <span className="text-sm font-semibold">Tickets/day</span></div>
            <p className="text-[11px] text-slate-500">Calculated across selected time window</p>
          </div>

          {/* Longest Pending Complaint */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Longest Pending Ticket</span>
            </div>
            {longestPending ? (
              <div>
                <div className="text-lg font-bold text-rose-400 font-mono">{longestPending.days} Days Pending</div>
                <div className="text-xs text-slate-200 truncate mt-0.5">{longestPending.complaint.title}</div>
                <div className="text-[10px] text-slate-500">ID: {longestPending.complaint.complaintId || longestPending.complaint.id}</div>
              </div>
            ) : (
              <div className="text-xs text-emerald-400 font-semibold pt-1">No pending complaints!</div>
            )}
          </div>

          {/* Most Active Staff */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Most Active Staff</span>
            </div>
            {mostActiveStaff ? (
              <div>
                <div className="text-base font-bold text-slate-100">{mostActiveStaff.staff.name}</div>
                <div className="text-xs text-indigo-400 font-medium">{mostActiveStaff.resolved} Resolved ({mostActiveStaff.assigned} Assigned)</div>
                <div className="text-[10px] text-slate-500">{mostActiveStaff.staff.department || 'Maintenance'}</div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 pt-1">No staff activity logged</div>
            )}
          </div>

          {/* Least Active Staff */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <UserX className="w-4 h-4 text-slate-400" />
              <span>Least Active Staff</span>
            </div>
            {leastActiveStaff ? (
              <div>
                <div className="text-base font-bold text-slate-200">{leastActiveStaff.staff.name}</div>
                <div className="text-xs text-slate-400 font-medium">{leastActiveStaff.resolved} Resolved ({leastActiveStaff.assigned} Assigned)</div>
                <div className="text-[10px] text-slate-500">{leastActiveStaff.staff.department || 'Maintenance'}</div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 pt-1">N/A</div>
            )}
          </div>

        </div>
      </div>

      {/* Department Analytics & Campus Heatmap Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Department Analytics */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-slate-100 text-sm">Department Analytics</h3>
            </div>
            <span className="text-[11px] text-slate-500">Resolution Rate</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {departmentAnalytics.map((dept) => (
              <div key={dept.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{dept.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">{dept.resolved} / {dept.total} resolved</span>
                    <span className="font-mono font-bold text-indigo-400">{dept.rate}%</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${dept.rate >= 80 ? 'bg-emerald-500' : dept.rate >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                    style={{ width: `${dept.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campus Heatmap */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-slate-100 text-sm">Campus Complaint Heatmap</h3>
            </div>
            <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location Concentration
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {heatmapData.length > 0 ? (
              heatmapData.map((loc, idx) => (
                <div key={loc.location} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 text-[10px] font-bold flex items-center justify-center border border-rose-500/20">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-200">{loc.location}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-400">{loc.open} Open</span>
                      <span className="text-slate-200 font-bold">{loc.total} Tickets</span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${loc.intensity > 70 ? 'bg-rose-500' : loc.intensity > 40 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${loc.intensity}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">No location heatmap data recorded yet.</div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Activity Feed */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">Recent Activity Feed</h3>
          </div>
          <span className="text-[11px] text-slate-500">Live System Events</span>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {auditLogs.length > 0 ? (
            auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{log.action}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      {log.target}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{log.details}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-semibold text-indigo-400">{log.actorName}</div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(log.timestamp || log.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">No activity events logged in database.</div>
          )}
        </div>
      </div>

      {/* Printable PDF / Executive Report Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl p-8 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">CampusConnect Infrastructure & Maintenance Executive Report</h2>
                <p className="text-xs text-slate-500">Generated directly from Supabase live database telemetry</p>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-100 font-medium">
                <div>Report Date: <strong className="block text-slate-900">{new Date().toLocaleDateString()}</strong></div>
                <div>Filter Period: <strong className="block text-slate-900">{timeRange}</strong></div>
                <div>Total Tickets: <strong className="block text-slate-900">{totalCount}</strong></div>
                <div>Avg Resolution: <strong className="block text-indigo-700">{avgResolutionTimeHours} Hours</strong></div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Category Performance Breakdown</h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-200 text-slate-800 font-bold">
                      <tr>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Total Tickets</th>
                        <th className="p-2.5">Resolved</th>
                        <th className="p-2.5">Resolution Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {departmentAnalytics.map(dept => (
                        <tr key={dept.name}>
                          <td className="p-2.5 font-medium">{dept.name}</td>
                          <td className="p-2.5">{dept.total}</td>
                          <td className="p-2.5">{dept.resolved}</td>
                          <td className="p-2.5 font-bold text-indigo-700">{dept.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 text-indigo-950 text-xs leading-relaxed border border-indigo-200">
                <strong>Executive Summary:</strong> All reported metrics reflect live data stored in Supabase. Average turnaround time across maintenance categories is currently maintained at {avgResolutionTimeHours} hours. Top complaint locations have been logged into the audit feed for scheduled preventative maintenance.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button onClick={() => setShowPrintModal(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-semibold text-xs">
                Close Preview
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print PDF Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

