import React, { useState, useEffect } from 'react';
import { Complaint, User, CategoryInfo, AuditLog } from '../../types';
import { apiService } from '../../services/api';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { useToast } from '../common/Toast';
import { 
  Shield, 
  Users, 
  Settings, 
  FileText, 
  BarChart2, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Edit3, 
  Search, 
  RefreshCw,
  AlertOctagon,
  Layers,
  KeyRound,
  Trash2,
  UserCheck,
  UserX,
  Lock
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  onSelectComplaint: (complaint: Complaint) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onSelectComplaint }) => {
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'complaints' | 'staff' | 'categories' | 'users' | 'audit'>('complaints');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Assign staff modal
  const [assigningComplaint, setAssigningComplaint] = useState<Complaint | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Status & Remarks Management Modal
  const [managingComplaint, setManagingComplaint] = useState<Complaint | null>(null);
  const [manageStatus, setManageStatus] = useState<any>('In Progress');
  const [manageRemarks, setManageRemarks] = useState('');
  const [manageStaffId, setManageStaffId] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // New Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatSla, setNewCatSla] = useState(24);

  // Admin Force Password Change Modal
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState<boolean>(Boolean(currentUser?.mustChangePassword));
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [isChangingAdminPassword, setIsChangingAdminPassword] = useState(false);

  // Staff Management Modals
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffDept, setStaffDept] = useState('Campus Electrical & Power');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffTitle, setStaffTitle] = useState('Senior Technician');
  const [staffPassword, setStaffPassword] = useState('');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffDept, setEditStaffDept] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffTitle, setEditStaffTitle] = useState('');

  // Reset Staff Password Modal
  const [resettingStaff, setResettingStaff] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [cList, catList, uList, logs] = await Promise.all([
        apiService.getComplaints(),
        apiService.getCategories(),
        apiService.getUsers(),
        apiService.getAuditLogs()
      ]);
      setComplaints(cList);
      setCategories(catList);
      setUsers(uList);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();

    const handleAutoRefresh = () => {
      loadAdminData();
    };

    window.addEventListener('complaint-created', handleAutoRefresh);
    window.addEventListener('complaint-updated', handleAutoRefresh);

    return () => {
      window.removeEventListener('complaint-created', handleAutoRefresh);
      window.removeEventListener('complaint-updated', handleAutoRefresh);
    };
  }, []);

  const staffMembers = users.filter(u => u.role === 'STAFF');

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewPassword || adminNewPassword.length < 6) {
      showToast('Weak Password', 'New password must be at least 6 characters long.', 'warning');
      return;
    }
    if (adminNewPassword === 'ChangeMe@123') {
      showToast('Invalid Password', 'Please choose a new password different from default ChangeMe@123.', 'warning');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      showToast('Mismatch', 'New password and confirm password do not match.', 'error');
      return;
    }

    setIsChangingAdminPassword(true);
    try {
      await apiService.changePassword(currentUser.id, adminNewPassword);
      showToast('Password Changed!', 'Super Admin password updated successfully.', 'success');
      setShowAdminPasswordModal(false);
      currentUser.mustChangePassword = false;
    } catch (err: any) {
      showToast('Password Change Failed', err.message || 'Error updating password', 'error');
    } finally {
      setIsChangingAdminPassword(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffDept || !staffPassword) {
      showToast('Missing Fields', 'Name, Email, Department, and Password are required.', 'error');
      return;
    }
    if (staffPassword.length < 6) {
      showToast('Weak Password', 'Password must be at least 6 characters long.', 'warning');
      return;
    }

    setIsCreatingStaff(true);
    try {
      await apiService.createStaff({
        name: staffName,
        email: staffEmail,
        department: staffDept,
        phone: staffPhone,
        staffTitle,
        password: staffPassword
      });
      showToast('Staff Created', `Created maintenance technician account for ${staffName}.`, 'success');
      setShowCreateStaffModal(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPassword('');
      loadAdminData();
    } catch (err: any) {
      showToast('Creation Failed', err.message || 'Could not create staff account.', 'error');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      await apiService.updateStaff(editingStaff.id, {
        name: editStaffName,
        department: editStaffDept,
        phone: editStaffPhone,
        staffTitle: editStaffTitle
      });
      showToast('Staff Updated', `Updated profile for ${editStaffName}`, 'success');
      setEditingStaff(null);
      loadAdminData();
    } catch (err: any) {
      showToast('Update Failed', err.message, 'error');
    }
  };

  const handleToggleStaffStatus = async (staff: User) => {
    const newDisabled = !staff.disabled;
    try {
      await apiService.toggleStaffStatus(staff.id, newDisabled);
      showToast('Status Updated', `${staff.name} account is now ${newDisabled ? 'Disabled' : 'Active'}.`, 'info');
      loadAdminData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleDeleteStaff = async (staff: User) => {
    if (!window.confirm(`Are you sure you want to delete staff account: ${staff.name}? This action cannot be undone.`)) return;
    try {
      await apiService.deleteStaff(staff.id);
      showToast('Staff Deleted', `Account for ${staff.name} has been removed.`, 'success');
      loadAdminData();
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingStaff || !resetNewPassword || resetNewPassword.length < 6) {
      showToast('Invalid Password', 'Password must be at least 6 characters long.', 'warning');
      return;
    }
    try {
      await apiService.resetStaffPassword(resettingStaff.id, resetNewPassword);
      showToast('Password Reset', `Password for ${resettingStaff.name} updated successfully.`, 'success');
      setResettingStaff(null);
      setResetNewPassword('');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleAssignStaff = async () => {
    if (!assigningComplaint || !selectedStaffId) return;
    try {
      const assignedUser = users.find(u => u.id === selectedStaffId);
      await apiService.updateComplaint(assigningComplaint.id, {
        assignedStaffId: selectedStaffId,
        status: (assigningComplaint.status === 'Submitted' || assigningComplaint.status === 'Under Review') ? 'Assigned' : assigningComplaint.status,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        resolutionRemarks: `Assigned technician: ${assignedUser?.name || 'Technician'}`
      });
      showToast('Staff Assigned', 'Technician was assigned and notified.', 'success');
      setAssigningComplaint(null);
      window.dispatchEvent(new Event('complaint-updated'));
      loadAdminData();
    } catch (err: any) {
      console.error(err);
      showToast('Assignment Failed', err?.message || 'Failed to assign staff', 'error');
    }
  };

  const handleManageStatusAndRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingComplaint) return;

    setIsUpdatingStatus(true);
    try {
      await apiService.updateComplaint(managingComplaint.id, {
        status: manageStatus,
        assignedStaffId: manageStaffId || undefined,
        resolutionRemarks: manageRemarks,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email
      });

      showToast('Complaint Updated', `Ticket ${managingComplaint.complaintId || managingComplaint.id} updated to ${manageStatus}.`, 'success');
      setManagingComplaint(null);
      setManageRemarks('');
      window.dispatchEvent(new Event('complaint-updated'));
      loadAdminData();
    } catch (err: any) {
      console.error(err);
      showToast('Update Failed', err?.message || 'Could not update complaint', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await apiService.getCategories(); // Endpoint updates category or creates
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          description: newCatDesc,
          defaultSlaHours: newCatSla,
          active: true
        })
      });
      if (res.ok) {
        showToast('Category Created', `Category ${newCatName} is now active.`, 'success');
        setShowCategoryModal(false);
        setNewCatName('');
        setNewCatDesc('');
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Status Filter Counts
  const pendingCount = complaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length;
  const assignedCount = complaints.filter(c => c.status === 'Assigned').length;
  const inProgressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;
  const closedCount = complaints.filter(c => c.status === 'Closed' || c.status === 'Rejected').length;

  const filteredComplaints = complaints.filter(c => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (c.complaintId || c.id).toLowerCase().includes(q);
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchStudent = (c.studentName || '').toLowerCase().includes(q);
      const matchRoll = (c.studentRollNo || c.studentId || '').toLowerCase().includes(q);
      const matchCategory = (c.category || '').toLowerCase().includes(q);
      const matchLoc = (c.location || '').toLowerCase().includes(q);

      if (!matchId && !matchTitle && !matchDesc && !matchStudent && !matchRoll && !matchCategory && !matchLoc) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'Pending') {
      if (c.status !== 'Submitted' && c.status !== 'Under Review') return false;
    } else if (statusFilter === 'Assigned') {
      if (c.status !== 'Assigned') return false;
    } else if (statusFilter === 'In Progress') {
      if (c.status !== 'In Progress') return false;
    } else if (statusFilter === 'Resolved') {
      if (c.status !== 'Resolved') return false;
    } else if (statusFilter === 'Closed') {
      if (c.status !== 'Closed' && c.status !== 'Rejected') return false;
    }

    // Category filter
    if (categoryFilter !== 'ALL' && categoryFilter !== 'All') {
      if (c.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    }

    // Priority filter
    if (priorityFilter !== 'ALL' && priorityFilter !== 'All') {
      if (c.priority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Admin Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/60 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100">Enterprise Admin Command Center</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Admin Governance
            </span>
          </div>
          <p className="text-xs text-slate-400">System-wide monitoring, staff allocation matrix, category SLAs, and real-time audit logs.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={loadAdminData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-bold text-slate-200 hover:border-purple-500/40 hover:text-purple-300 transition-all shadow-md"
          >
            <RefreshCw className="w-4 h-4 text-purple-400" />
            Refresh Matrix
          </button>
        </div>
      </div>

      {/* Admin KPI Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Total Tickets</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400"><Layers className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-slate-100">{complaints.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Campus wide total</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Pending Dispatch</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400"><AlertOctagon className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Needs staff assignment</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>In Progress</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400"><BarChart2 className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-indigo-400">{inProgressCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Under active repair</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Resolved</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{resolvedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Technician completed</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-lg col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Active Staff</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"><Users className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-blue-300">{staffMembers.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">On-duty specialists</p>
        </div>
      </div>

      {/* Admin Recent Activity Timeline Widget */}
      {auditLogs.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <FileText className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Recent System Audit Activity</h3>
            </div>
            <button 
              onClick={() => setActiveTab('audit')} 
              className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              View Full Audit Stream →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {auditLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 truncate">{log.actorName} ({log.actorRole})</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </span>
                </div>
                <div className="text-purple-400 font-medium text-[11px]">{log.action}</div>
                <p className="text-slate-400 text-[11px] line-clamp-1">{log.details || log.remarks || 'Action logged in system'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'complaints'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Master Complaints Matrix ({complaints.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'staff'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Workload ({staffMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'categories'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Categories & SLAs ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          User Roles ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit Log Stream ({auditLogs.length})
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          Loading admin dataset...
        </div>
      ) : activeTab === 'complaints' ? (
        <div className="space-y-4">
          
          {/* Filters and Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search Ticket ID, Student Name, Roll No, Category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border ${
                statusFilter === 'ALL'
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              All ({complaints.length})
            </button>
            <button
              onClick={() => setStatusFilter('Pending')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border ${
                statusFilter === 'Pending'
                  ? 'bg-amber-600/30 text-amber-200 border-amber-500/50 shadow'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('Assigned')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border ${
                statusFilter === 'Assigned'
                  ? 'bg-blue-600/30 text-blue-200 border-blue-500/50 shadow'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Assigned ({assignedCount})
            </button>
            <button
              onClick={() => setStatusFilter('In Progress')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border ${
                statusFilter === 'In Progress'
                  ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50 shadow'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('Resolved')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border ${
                statusFilter === 'Resolved'
                  ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/50 shadow'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('Closed')}
              className={`px-3.5 py-1.5 rounded-xl transition-all border ${
                statusFilter === 'Closed'
                  ? 'bg-slate-700/50 text-slate-200 border-slate-600/50 shadow'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              Closed ({closedCount})
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Complaint ID</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Roll Number</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Submitted Date</th>
                    <th className="p-4">Assigned Staff</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <div className="font-bold text-sm text-slate-300">No complaints found.</div>
                        <div className="text-xs text-slate-500 mt-1">There are no complaint records matching your selected search or filter criteria.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-indigo-400">{c.complaintId || c.id}</td>
                        <td className="p-4 font-semibold text-slate-100">{c.studentName}</td>
                        <td className="p-4 font-mono text-slate-300">{c.studentRollNo || 'STD-2026'}</td>
                        <td className="p-4 text-slate-300">{c.category}</td>
                        <td className="p-4"><PriorityBadge priority={c.priority} size="sm" /></td>
                        <td className="p-4"><StatusBadge status={c.status} size="sm" /></td>
                        <td className="p-4 text-slate-400 whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4 font-semibold text-slate-200 whitespace-nowrap">
                          {c.assignedStaffName ? c.assignedStaffName : <span className="text-amber-400 font-normal">Unassigned</span>}
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => { setAssigningComplaint(c); setSelectedStaffId(c.assignedStaffId || ''); }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-[11px]"
                            title="Assign Staff"
                          >
                            Assign Staff
                          </button>
                          <button
                            onClick={() => {
                              setManagingComplaint(c);
                              setManageStatus(c.status);
                              setManageRemarks(c.resolutionRemarks || '');
                              setManageStaffId(c.assignedStaffId || '');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold text-[11px]"
                            title="Update Status & Remarks"
                          >
                            Manage Status
                          </button>
                          <button
                            onClick={() => onSelectComplaint(c)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px]"
                            title="View Complaint Details"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'staff' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Staff & Maintenance Technicians</h3>
              <p className="text-xs text-slate-400">Manage support staff accounts, department assignments, and login permissions.</p>
            </div>
            <button
              onClick={() => setShowCreateStaffModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-amber-600/20"
            >
              <UserPlus className="w-4 h-4" /> Add Staff Member
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffMembers.map(stf => {
              const assignedCount = complaints.filter(c => c.assignedStaffId === stf.id).length;
              const activeCount = complaints.filter(c => c.assignedStaffId === stf.id && c.status === 'In Progress').length;
              const isDisabled = Boolean(stf.disabled);

              return (
                <div key={stf.id} className={`p-5 rounded-2xl bg-slate-900 border ${isDisabled ? 'border-rose-900/40 opacity-70' : 'border-slate-800'} space-y-3 relative group`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={stf.avatar} alt={stf.name} className="w-11 h-11 rounded-xl object-cover border border-slate-800" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-100 text-sm">{stf.name}</h3>
                          {isDisabled && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/20 text-rose-300">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-indigo-400">{stf.department}</p>
                        <p className="text-[11px] text-slate-500">{stf.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px]">Total Tickets</span>
                      <span className="text-sm font-bold text-slate-100">{assignedCount} Assigned</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px]">In Progress</span>
                      <span className="text-sm font-bold text-amber-400">{activeCount} Active</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs gap-1">
                    <button
                      onClick={() => {
                        setEditingStaff(stf);
                        setEditStaffName(stf.name);
                        setEditStaffDept(stf.department || '');
                        setEditStaffPhone(stf.phone || '');
                        setEditStaffTitle(stf.staffTitle || 'Technician');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>

                    <button
                      onClick={() => {
                        setResettingStaff(stf);
                        setResetNewPassword('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset Pass
                    </button>

                    <button
                      onClick={() => handleToggleStaffStatus(stf)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${
                        isDisabled ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      }`}
                    >
                      {isDisabled ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {isDisabled ? 'Enable' : 'Disable'}
                    </button>

                    <button
                      onClick={() => handleDeleteStaff(stf)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Delete Staff"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Configured Complaint Categories & SLA Targets</h3>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-sm">{cat.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-mono font-bold">
                    {cat.defaultSlaHours}h SLA
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{cat.description}</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-500">
                  <span>Assigned Staff Pool: {cat.assignedStaffCount}</span>
                  <span className="text-emerald-400 font-semibold">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden text-xs">
          <table className="w-full text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department / Roll No</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="p-4 flex items-center gap-2">
                    <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-lg object-cover" />
                    <span className="font-bold text-slate-100">{u.name}</span>
                  </td>
                  <td className="p-4 text-slate-400">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 font-bold rounded ${
                      u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                      u.role === 'STAFF' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{u.department || u.rollNo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Audit Logs */
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            Immutable audit log stream capturing all complaint status updates, staff assignments, category reconfigurations, and export events.
          </div>
          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{log.actorName}</span>
                    <span className="px-1.5 py-0.5 text-[9px] rounded font-mono bg-slate-800 text-purple-300">{log.actorRole}</span>
                    <span className="text-indigo-400 font-mono">{log.action}</span>
                  </div>
                  <div className="text-slate-300 mt-1">{log.details}</div>
                </div>
                <div className="text-right text-[10px] text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleString()} • IP: {log.ipAddress}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Assignment Modal */}
      {assigningComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Assign Maintenance Technician</h3>
            <p className="text-xs text-slate-400">Select staff member to handle: <strong className="text-slate-200">{assigningComplaint.title}</strong></p>

            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none"
            >
              <option value="">Select Technician...</option>
              {staffMembers.map(stf => (
                <option key={stf.id} value={stf.id}>{stf.name} ({stf.department})</option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setAssigningComplaint(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                Cancel
              </button>
              <button onClick={handleAssignStaff} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow">
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form onSubmit={handleCreateCategory} className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add New Complaint Category</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category Name</label>
              <input
                type="text"
                placeholder="e.g. Elevator Maintenance"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <input
                type="text"
                placeholder="Brief scope of category..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Default SLA Target (Hours)</label>
              <input
                type="number"
                value={newCatSla}
                onChange={(e) => setNewCatSla(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                min={1}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow">
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreateStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form onSubmit={handleCreateStaff} className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <UserPlus className="w-5 h-5" />
              <h3 className="font-bold text-slate-100 text-base">Add Staff / Technician Account</h3>
            </div>
            <p className="text-xs text-slate-400">Staff accounts are managed exclusively by the Admin Dashboard.</p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                placeholder="staff.name@vignan.ac.in"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
                <select
                  value={staffDept}
                  onChange={(e) => setStaffDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                >
                  <option value="Campus Electrical & Power">Electrical & Power</option>
                  <option value="Water Supply & Plumbing">Water & Plumbing</option>
                  <option value="IT Infrastructure & Network">IT Infrastructure</option>
                  <option value="Civil & Structural Maintenance">Civil & Building</option>
                  <option value="Hostel & Facilities Management">Hostel Facilities</option>
                  <option value="Sanitation & Cleanliness">Sanitation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Tech"
                  value={staffTitle}
                  onChange={(e) => setStaffTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateStaffModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingStaff}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
              >
                {isCreatingStaff ? 'Creating Account...' : 'Create Staff Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form onSubmit={handleUpdateStaff} className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Edit Staff Profile: {editingStaff.name}</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={editStaffName}
                onChange={(e) => setEditStaffName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={editStaffDept}
                onChange={(e) => setEditStaffDept(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={editStaffPhone}
                onChange={(e) => setEditStaffPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reset Staff Password Modal */}
      {resettingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form onSubmit={handleResetStaffPassword} className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-bold text-slate-100 text-base">Reset Password for {resettingStaff.name}</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Password (Min 6 chars) *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setResettingStaff(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow"
              >
                Reset Password
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Manage Complaint Status & Remarks Modal */}
      {managingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <form onSubmit={handleManageStatusAndRemarks} className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-slate-100 text-base">Manage Ticket: {managingComplaint.complaintId || managingComplaint.id}</h3>
                <p className="text-xs text-slate-400">Student: <strong className="text-slate-200">{managingComplaint.studentName}</strong> ({managingComplaint.studentRollNo || 'STD-2026'})</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                {managingComplaint.category}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Update Ticket Status *</label>
              <select
                value={manageStatus}
                onChange={(e) => setManageStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500 font-semibold"
                required
              >
                <option value="Submitted">Submitted (Pending Review)</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Maintenance Staff / Technician</label>
              <select
                value={manageStaffId}
                onChange={(e) => setManageStaffId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Keep Current / Unassigned --</option>
                {staffMembers.map(stf => (
                  <option key={stf.id} value={stf.id}>{stf.name} ({stf.department})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Remarks / Inspection Notes</label>
              <textarea
                value={manageRemarks}
                onChange={(e) => setManageRemarks(e.target.value)}
                placeholder="Enter remarks, action plan, or resolution details..."
                rows={4}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-purple-500 leading-relaxed"
              />
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-300">
              ⚡ Saving this update automatically records a new entry in <code className="font-mono text-purple-200 font-bold">complaint_history</code> and logs an entry in <code className="font-mono text-purple-200 font-bold">audit_logs</code> in the database.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManagingComplaint(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
              >
                {isUpdatingStatus ? 'Saving Changes...' : 'Save Updates & Log Audit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mandatory Admin First Login Password Change Modal */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <form onSubmit={handleAdminChangePassword} className="relative w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-lg">Action Required: Change Password</h3>
                <p className="text-xs text-amber-400 font-semibold">Security Policy Enforced</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              You are logged in with the initial default Super Admin credentials (<code className="text-amber-300 font-bold">ChangeMe@123</code>). For system integrity and audit security, you must update your password before continuing.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password (Min 6 chars) *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isChangingAdminPassword}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
            >
              {isChangingAdminPassword ? 'Updating Password...' : 'Update Admin Password'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
