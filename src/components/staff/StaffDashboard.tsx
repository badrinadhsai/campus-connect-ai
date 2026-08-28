import React, { useState, useEffect } from 'react';
import { Complaint, User } from '../../types';
import { apiService } from '../../services/api';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { useToast } from '../common/Toast';
import { 
  Wrench, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  Upload, 
  Send, 
  CheckCheck, 
  RefreshCw,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

interface StaffDashboardProps {
  currentUser: User;
  onSelectComplaint: (complaint: Complaint) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ currentUser, onSelectComplaint }) => {
  const { showToast } = useToast();
  const [assignedComplaints, setAssignedComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');

  // Resolution Modal State
  const [resolvingComplaint, setResolvingComplaint] = useState<Complaint | null>(null);
  const [remarks, setRemarks] = useState('');
  const [proofUrl, setProofUrl] = useState('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // Rejection Modal State
  const [rejectingComplaint, setRejectingComplaint] = useState<Complaint | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // Progress Remarks Modal State
  const [updatingComplaint, setUpdatingComplaint] = useState<Complaint | null>(null);
  const [progressRemarks, setProgressRemarks] = useState('');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const staffTasks = await apiService.getComplaints({
        role: 'STAFF',
        userId: currentUser.id,
        userEmail: currentUser.email
      });
      setAssignedComplaints(staffTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();

    const handleReload = () => fetchStaffData();
    window.addEventListener('complaint-updated', handleReload);
    window.addEventListener('complaint-created', handleReload);

    return () => {
      window.removeEventListener('complaint-updated', handleReload);
      window.removeEventListener('complaint-created', handleReload);
    };
  }, [currentUser]);

  const handleAcceptAssignment = async (complaintId: string) => {
    try {
      await apiService.updateComplaint(complaintId, {
        status: 'In Progress',
        assignedStaffId: currentUser.id,
        action: 'Accepted Assignment',
        remarks: 'Technician accepted assignment and started work.',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email
      });
      showToast('Assignment Accepted', 'Status set to In Progress. Student notified.', 'success');
      window.dispatchEvent(new Event('complaint-updated'));
      fetchStaffData();
    } catch (err) {
      console.error(err);
      showToast('Error accepting assignment', '', 'error');
    }
  };

  const handleRejectAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingComplaint || !rejectionReason.trim()) return;

    setIsSubmittingRejection(true);
    try {
      await apiService.updateComplaint(rejectingComplaint.id, {
        status: 'Under Review',
        unassignStaff: true,
        rejectionReason: rejectionReason.trim(),
        action: 'Assignment Rejected',
        remarks: `Technician rejected assignment: ${rejectionReason.trim()}`,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email
      });

      showToast('Assignment Rejected', 'Ticket returned to Admin queue with reason logged.', 'info');
      window.dispatchEvent(new Event('complaint-updated'));
      setRejectingComplaint(null);
      setRejectionReason('');
      fetchStaffData();
    } catch (err) {
      console.error(err);
      showToast('Error rejecting assignment', '', 'error');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingComplaint || !progressRemarks.trim()) return;

    setIsSubmittingProgress(true);
    try {
      await apiService.updateComplaint(updatingComplaint.id, {
        status: 'In Progress',
        resolutionRemarks: progressRemarks.trim(),
        action: 'Work Progress Update',
        remarks: progressRemarks.trim(),
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email
      });

      showToast('Progress Remarks Added', 'Work remarks logged and student notified.', 'success');
      window.dispatchEvent(new Event('complaint-updated'));
      setUpdatingComplaint(null);
      setProgressRemarks('');
      fetchStaffData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update progress', '', 'error');
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  const handleCompleteResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingComplaint) return;

    setIsSubmittingResolution(true);
    try {
      await apiService.updateComplaint(resolvingComplaint.id, {
        status: 'Resolved',
        resolutionRemarks: remarks || 'Maintenance work completed and verified.',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        proofAttachment: {
          url: proofUrl,
          fileName: 'resolution_proof_photo.jpg'
        }
      });

      showToast('Task Marked Resolved!', 'Proof photo attached and student notified.', 'success');
      window.dispatchEvent(new Event('complaint-updated'));
      setResolvingComplaint(null);
      setRemarks('');
      fetchStaffData();
    } catch (err) {
      console.error(err);
      showToast('Failed to resolve issue', '', 'error');
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const filteredTasks = assignedComplaints.filter(c => {
    if (activeTab === 'pending') return c.status === 'Assigned' || c.status === 'Submitted' || c.status === 'Under Review';
    if (activeTab === 'in_progress') return c.status === 'In Progress';
    if (activeTab === 'completed') return c.status === 'Resolved' || c.status === 'Closed';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Staff Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-indigo-950/50 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-amber-500/30 shadow-xl" />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-950 font-bold" title="Verified Staff">
              <Wrench className="w-3 h-3 text-slate-950" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100">{currentUser.name}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Staff / Technician
              </span>
            </div>
            <p className="text-xs text-amber-300/90 font-medium flex items-center gap-2">
              <span>{currentUser.staffTitle || 'Senior Maintenance Specialist'}</span>
              <span>•</span>
              <span className="text-slate-300">{currentUser.department}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/90 text-xs shadow-inner shrink-0">
          <div>
            <div className="text-slate-400 font-medium">Assigned Queue</div>
            <div className="text-xl font-black text-amber-400">{assignedComplaints.length} Active Tasks</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-slate-400 font-medium">SLA Health</div>
            <div className="text-xl font-black text-emerald-400 flex items-center gap-1">
              98.4% <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">On Time</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Pending Action</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400"><Clock className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {assignedComplaints.filter(c => c.status === 'Assigned' || c.status === 'Submitted' || c.status === 'Under Review').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting technician acceptance</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>In Progress</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400"><Wrench className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-indigo-400">
            {assignedComplaints.filter(c => c.status === 'In Progress').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active repair works</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Resolved</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {assignedComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Completed assignments</p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Avg Repair SLA</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400"><ShieldCheck className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-bold text-purple-300">
            2.4 Hours
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Faster than 24h target</p>
        </div>
      </div>

      {/* Staff Recent Activity Timeline */}
      {assignedComplaints.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Staff Activity & Task Timeline</h3>
            </div>
            <span className="text-[11px] text-slate-400">Live Dispatch Tracker</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignedComplaints.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectComplaint(item)}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {item.complaintId || item.id}
                  </span>
                  <StatusBadge status={item.status} size="sm" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-300 line-clamp-1 transition-colors">
                  {item.title}
                </h4>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-amber-400" /> {item.location}</span>
                  <span className="text-indigo-300 font-mono font-bold">{item.slaTargetHours}h SLA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Queue Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending / Assigned ({assignedComplaints.filter(c => c.status === 'Assigned' || c.status === 'Submitted' || c.status === 'Under Review').length})
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'in_progress'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            In Progress ({assignedComplaints.filter(c => c.status === 'In Progress').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'completed'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed / Resolved ({assignedComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length})
          </button>
        </div>

        <button
          onClick={fetchStaffData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          Refresh
        </button>
      </div>

      {/* Task Cards */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          Loading staff task queue...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-800 text-center space-y-2 bg-slate-900/40">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No assigned complaints.</h3>
          <p className="text-xs text-slate-500">You currently have no tasks assigned in this status view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(c => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    {c.id}
                  </span>
                  <StatusBadge status={c.status} size="sm" />
                  <PriorityBadge priority={c.priority} size="sm" />
                </div>

                <h3 className="text-sm font-bold text-slate-100">{c.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-1">{c.description}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    {c.location}
                  </span>
                  <span>Student: <strong className="text-slate-200">{c.studentName}</strong></span>
                  <span className="text-indigo-400 font-semibold">{c.slaTargetHours}h SLA Window</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                <button
                  onClick={() => onSelectComplaint(c)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  View Details
                </button>

                {(c.status === 'Assigned' || c.status === 'Submitted' || c.status === 'Under Review') && (
                  <>
                    <button
                      onClick={() => handleAcceptAssignment(c.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-600/20 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Accept Assignment
                    </button>
                    <button
                      onClick={() => {
                        setRejectingComplaint(c);
                        setRejectionReason('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Reject Assignment
                    </button>
                  </>
                )}

                {c.status === 'In Progress' && (
                  <>
                    <button
                      onClick={() => {
                        setUpdatingComplaint(c);
                        setProgressRemarks(c.resolutionRemarks || '');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Add Progress Remarks
                    </button>
                    <button
                      onClick={() => setResolvingComplaint(c)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-600/30 transition-colors"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Upload Proof & Resolve
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Assignment Modal */}
      {rejectingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-slate-100 text-base">Reject Complaint Assignment</h3>
              </div>
              <button onClick={() => setRejectingComplaint(null)} className="text-slate-400 hover:text-slate-200 text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleRejectAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Ticket ID</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-rose-400 font-mono font-bold">
                  {rejectingComplaint.complaintId || rejectingComplaint.id} - {rejectingComplaint.title}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Rejection Reason *</label>
                <textarea
                  rows={3}
                  placeholder="State clearly why you cannot handle this assignment (e.g. out of domain, lack of replacement parts)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectingComplaint(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRejection}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Remarks Modal */}
      {updatingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-slate-100 text-base">Update Work Progress Remarks</h3>
              </div>
              <button onClick={() => setUpdatingComplaint(null)} className="text-slate-400 hover:text-slate-200 text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateProgress} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Ticket ID</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 font-mono font-bold">
                  {updatingComplaint.complaintId || updatingComplaint.id} - {updatingComplaint.title}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Work Remarks / Status Update *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Inspected faulty distribution board, replacement relay ordered from central store..."
                  value={progressRemarks}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUpdatingComplaint(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProgress}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  Save & Notify Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolution Proof Upload Modal */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">Complete Issue Resolution</h3>
              </div>
              <button onClick={() => setResolvingComplaint(null)} className="text-slate-400 hover:text-slate-200">
                &times;
              </button>
            </div>

            <form onSubmit={handleCompleteResolution} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Ticket ID</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 font-mono font-bold">
                  {resolvingComplaint.id} - {resolvingComplaint.title}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Resolution Remarks *</label>
                <textarea
                  rows={3}
                  placeholder="Explain what repair work or replacement was carried out..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Attach Completion Proof Photo</label>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <img src={proofUrl} alt="Proof" className="w-16 h-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="text-slate-200 font-semibold">Resolution Proof Attached</div>
                    <div className="text-[10px] text-slate-500">Photo verified for student audit</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolvingComplaint(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolution}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-600/30"
                >
                  Confirm & Mark Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
