import React, { useState } from 'react';
import { Complaint, User } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { apiService } from '../../services/api';
import { useToast } from '../common/Toast';
import { 
  X, 
  MapPin, 
  Calendar, 
  User as UserIcon, 
  Send, 
  ThumbsUp, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Image as ImageIcon,
  MessageSquare,
  History,
  CheckCheck,
  RotateCcw
} from 'lucide-react';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  onClose: () => void;
  currentUser: User | null;
  onRefresh?: () => void;
  onUpdate?: () => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  onClose,
  currentUser,
  onRefresh,
  onUpdate
}) => {
  const notifyUpdate = () => {
    if (onRefresh) onRefresh();
    if (onUpdate) onUpdate();
    window.dispatchEvent(new Event('complaint-updated'));
  };
  const { showToast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [upvotes, setUpvotes] = useState(complaint?.upvotes || 0);
  const [upvotedBy, setUpvotedBy] = useState<string[]>(complaint?.upvotedBy || []);

  if (!complaint) return null;

  const isUpvoted = upvotedBy.includes(currentUser.id);

  const handleUpvote = async () => {
    try {
      const res = await apiService.toggleUpvote(complaint.id, currentUser.id);
      setUpvotes(res.upvotes);
      setUpvotedBy(res.upvotedBy);
      showToast(isUpvoted ? 'Upvote Removed' : 'Issue Upvoted!', isUpvoted ? '' : 'Upvoting increases visibility on campus dashboards.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      await apiService.addComment(complaint.id, {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        userAvatar: currentUser.avatar,
        content: newComment,
        isInternal: false
      });
      setNewComment('');
      showToast('Comment Posted', 'Your message was added to the discussion.', 'success');
      notifyUpdate();
    } catch (err) {
      console.error(err);
      showToast('Failed to post comment', '', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCloseComplaint = async () => {
    if (!currentUser) return;
    try {
      await apiService.updateComplaint(complaint.id, {
        status: 'Closed',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        resolutionRemarks: 'Closed by student - problem resolved satisfactorily.'
      });
      showToast('Issue Closed', 'Thank you for verifying the resolution!', 'success');
      notifyUpdate();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReopenComplaint = async () => {
    if (!currentUser) return;
    try {
      await apiService.updateComplaint(complaint.id, {
        status: 'In Progress',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        resolutionRemarks: 'Reopened by student - requires further inspection.'
      });
      showToast('Issue Reopened', 'Technicians have been notified.', 'warning');
      notifyUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const statusSteps = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];
  const currentStepIndex = statusSteps.indexOf(complaint.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {complaint.id}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
            <h2 className="text-lg font-bold text-slate-100">{complaint.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Progress Bar Timeline */}
          {complaint.status !== 'Rejected' && (
            <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                Resolution Progress Workflow
              </h4>
              <div className="relative flex items-center justify-between">
                {statusSteps.map((step, idx) => {
                  const isCompleted = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-[11px] font-medium mt-2 text-center ${
                        isCompleted ? 'text-slate-200' : 'text-slate-500'
                      }`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="md:col-span-2 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-slate-200 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 leading-relaxed">
                  {complaint.description}
                </p>
              </div>

              {/* Resolution Remarks & Proof Photo if resolved */}
              {complaint.status === 'Resolved' && (
                <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <CheckCheck className="w-4 h-4" />
                    Technician Resolution Remarks
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed mb-3">
                    {complaint.resolutionRemarks || 'Maintenance work completed and verified.'}
                  </p>

                  {/* Resolution Proof Attachments */}
                  {complaint.attachments.some(a => a.isResolutionProof) && (
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-300 mb-1.5">Proof of Completion Photo:</div>
                      <div className="flex gap-2">
                        {complaint.attachments.filter(a => a.isResolutionProof).map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border border-emerald-500/30">
                            <img src={att.url} alt="Proof" className="w-32 h-24 object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-semibold text-white transition-opacity">
                              View Proof
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Satisfaction Action */}
                  <div className="mt-4 pt-3 border-t border-emerald-800/30 flex items-center justify-between">
                    <span className="text-xs text-emerald-300 font-medium">Are you satisfied with this resolution?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReopenComplaint}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reopen Issue
                      </button>
                      <button
                        onClick={handleCloseComplaint}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-600/30 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Closed
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {complaint.attachments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> Attached Evidence ({complaint.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {complaint.attachments.map((att, i) => (
                      <a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
                      >
                        <img src={att.url} alt={att.fileName} className="w-full h-28 object-cover group-hover:scale-105 transition-transform" />
                        <div className="p-2 text-[10px] text-slate-400 truncate bg-slate-950/90">{att.fileName}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussion & Comments */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  Resolution Discussion ({complaint.comments.length})
                </h4>

                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                  {complaint.comments.length === 0 ? (
                    <div className="p-4 rounded-xl border border-slate-800/80 text-center text-xs text-slate-500">
                      No comments yet. Post a message to communicate with maintenance staff.
                    </div>
                  ) : (
                    complaint.comments.map(c => (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-xl border text-xs ${
                          c.isInternal
                            ? 'bg-purple-950/20 border-purple-800/40 text-purple-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">{c.userName}</span>
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              c.userRole === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                              c.userRole === 'STAFF' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {c.userRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="leading-relaxed text-slate-200">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* New Comment Box */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message or response..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Post
                  </button>
                </form>
              </div>

            </div>

            {/* Sidebar Meta */}
            <div className="space-y-4">
              
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Location:</span>
                  <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    {complaint.location}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Reported By:</span>
                  <span className="text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    {complaint.studentName} ({complaint.studentRollNo})
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Assigned Staff:</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">
                    {complaint.assignedStaffName ? `${complaint.assignedStaffName} (${complaint.assignedDepartment})` : 'Awaiting Assignment'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Submitted Date:</span>
                  <span className="text-slate-300 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(complaint.createdAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Target SLA Window:</span>
                  <span className="text-indigo-400 font-semibold">{complaint.slaTargetHours} Hours SLA</span>
                </div>
              </div>

              {/* Upvote Button */}
              <button
                onClick={handleUpvote}
                className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  isUpvoted
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <ThumbsUp className={`w-4 h-4 ${isUpvoted ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                Upvote Issue ({upvotes})
              </button>

              {/* Audit Timeline */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  Audit Timeline
                </h4>
                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {complaint.timeline.map((t, idx) => (
                    <div key={idx} className="relative pl-6 text-[11px]">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-slate-900 border border-indigo-500 flex items-center justify-center text-[8px] text-indigo-400 font-bold">
                        •
                      </div>
                      <div className="font-semibold text-slate-200">{t.title}</div>
                      <div className="text-slate-400">{t.description}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {t.actorName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
