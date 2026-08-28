import React, { useState } from 'react';
import { ComplaintCategory, ComplaintPriority, User } from '../../types';
import { apiService } from '../../services/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useToast } from '../common/Toast';
import { 
  X, 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  MapPin, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  Loader2,
  Trash2
} from 'lucide-react';

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSuccess: () => void;
}

const CATEGORIES: { name: ComplaintCategory; icon: string }[] = [
  { name: 'Classroom', icon: '🏫' },
  { name: 'Laboratory', icon: '🔬' },
  { name: 'Library', icon: '📚' },
  { name: 'Wi-Fi', icon: '📶' },
  { name: 'Hostel', icon: '🏢' },
  { name: 'Mess', icon: '🍽️' },
  { name: 'Bus', icon: '🚌' },
  { name: 'Electricity', icon: '⚡' },
  { name: 'Water', icon: '💧' },
  { name: 'Washroom', icon: '🚽' },
  { name: 'Furniture', icon: '🪑' },
  { name: 'Sports', icon: '⚽' },
  { name: 'Medical', icon: '🚑' },
  { name: 'Lost & Found', icon: '🎒' },
  { name: 'Parking', icon: '🅿️' },
  { name: 'Security', icon: '🛡️' },
  { name: 'Other', icon: '❓' }
];

export const NewComplaintModal: React.FC<NewComplaintModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('Classroom');
  const [priority, setPriority] = useState<ComplaintPriority>('Medium');
  const [location, setLocation] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; fileName: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<{
    category: string;
    priority: string;
    department?: string;
    suggestedAction?: string;
    reasoning: string;
  } | null>(null);

  const student = currentUser || {
    id: 'guest-student',
    name: 'Student',
    email: 'student@campus.edu',
    role: 'STUDENT' as const,
    rollNo: '211FA04001',
    branch: 'CSE',
    year: '4th Year'
  };

  if (!isOpen) return null;

  const handleAiSuggest = async () => {
    if (!title || title.length < 5) {
      showToast('Title too short', 'Please type a short problem title first so AI can analyze it.', 'warning');
      return;
    }
    setIsAiLoading(true);
    setAiResult(null);
    try {
      const res = await apiService.suggestAIFields(title, description || title);
      if (res.category && CATEGORIES.some(c => c.name === res.category)) {
        setCategory(res.category as ComplaintCategory);
      }
      if (res.priority) {
        setPriority(res.priority as ComplaintPriority);
      }
      setAiResult({
        category: res.category,
        priority: res.priority,
        department: res.department || 'Campus Facilities & Maintenance',
        suggestedAction: res.suggestedAction || 'Assign staff to inspect location.',
        reasoning: res.reasoning || 'AI auto-analyzed report context.'
      });
      showToast('AI Classification Complete', `Category: ${res.category} | Priority: ${res.priority}`, 'info');
    } catch (err) {
      console.error(err);
      showToast('AI Auto-classification error', 'Defaulted to current selections.', 'info');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          showToast('Invalid File Type', 'Only image files (JPG, PNG, WebP) are allowed.', 'warning');
          continue;
        }

        let imageUrl = '';

        // Try Supabase Storage if configured
        if (isSupabaseConfigured && supabase) {
          try {
            const fileName = `complaint_${Date.now()}_${Math.floor(Math.random() * 1000)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const { data, error } = await supabase.storage.from('complaints').upload(fileName, file);
            if (!error && data) {
              const { data: publicUrlData } = supabase.storage.from('complaints').getPublicUrl(fileName);
              imageUrl = publicUrlData.publicUrl;
            }
          } catch (supaErr) {
            console.warn('Supabase upload fallback to local data URL:', supaErr);
          }
        }

        // Fallback to Data URL if Supabase storage upload didn't yield URL
        if (!imageUrl) {
          imageUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        }

        setAttachments(prev => [...prev, { url: imageUrl, fileName: file.name }]);
      }
      showToast('Image Attached', `${files.length} image(s) uploaded successfully.`, 'success');
    } catch (err) {
      console.error('File upload error:', err);
      showToast('Upload Error', 'Failed to upload image. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) {
      showToast('Required Fields Missing', 'Please fill in Title, Description, and Campus Location.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[NewComplaintModal Debug] Student Authentication Verification:', {
        isAuthenticated: !!currentUser,
        studentId: student.id,
        email: student.email,
        name: student.name,
        rollNo: student.rollNo,
        branch: student.branch,
        year: student.year
      });

      const result = await apiService.createComplaint({
        title,
        description,
        category,
        priority,
        location,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        studentRollNo: student.rollNo || 'STD-2026',
        studentBranch: student.branch || 'CSE',
        studentYear: student.year || '4th Year',
        attachments: attachments.map((att, i) => ({
          id: `att-${Date.now()}-${i}`,
          url: att.url,
          fileName: att.fileName,
          fileType: 'image/jpeg',
          uploadedAt: new Date().toISOString()
        }))
      });

      console.log('[NewComplaintModal] Created Complaint Result:', result);
      showToast('Complaint Logged Successfully!', `Ticket ${result.complaintId || 'submitted'} recorded.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[NewComplaintModal] Complete Complaint Submission Error:', err);
      if (err && typeof err === 'object') {
        console.error('[Supabase Error Object Details]:', JSON.stringify(err, null, 2));
      }
      const actualError = err?.message || String(err);
      showToast('Database Error Submitting Complaint', actualError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Submit Campus Problem Report</h3>
              <p className="text-xs text-slate-400">Log an issue for instant auto-routing to campus technicians</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Auto-attached Student Profile Notice */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <img
                src={student.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                alt={student.name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-indigo-500/40"
              />
              <div>
                <span className="text-slate-200 font-bold">{student.name}</span>
                <span className="text-slate-400 text-[11px] ml-2 font-mono">({student.rollNo || 'STD-2026'})</span>
                <span className="text-indigo-400 text-[11px] ml-2">[{student.branch || student.department || 'CSE'} - {student.year || '4th Year'}]</span>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold border border-emerald-500/20">
              Auto-Attached
            </span>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Problem Title *</label>
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors disabled:opacity-50"
              >
                {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                Auto-Categorize with Gemini AI
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g., HDMI audio distorted and flickering screen in LH 301"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
              required
            />
            
            {/* Rich AI Recommendation Banner */}
            {aiResult && (
              <div className="mt-2 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/30 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Gemini Smart AI Auto-Detection Result
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 font-semibold">
                    1-Click Auto-Applied
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-indigo-500/20">
                  <div>
                    <span className="text-slate-400">Category:</span> <strong className="text-slate-100">{aiResult.category}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Priority:</span> <strong className="text-amber-300">{aiResult.priority}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Target Dept:</span> <strong className="text-purple-300">{aiResult.department}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Suggested Action:</span> <span className="text-emerald-300 italic">{aiResult.suggestedAction}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Detailed Description *</label>
            <textarea
              rows={3}
              placeholder="Describe the problem, when it occurs, and any potential safety concerns..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
              required
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Category *</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition-all ${
                    category === cat.name
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Campus Location / Room *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Engineering Block B - Room 304"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Urgency / Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="Low">Low (General maintenance - 48h SLA)</option>
                <option value="Medium">Medium (Standard issue - 24h SLA)</option>
                <option value="High">High (Impacting classes/lab - 12h SLA)</option>
                <option value="Critical">Critical (Safety hazard / pipe burst - 6h SLA)</option>
              </select>
            </div>

          </div>

          {/* Attachments / Photo Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">Attach Photos (Optional)</label>
              <span className="text-[11px] text-slate-500">JPG, PNG, WebP allowed</span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Upload className="w-4 h-4 text-indigo-400" />}
                <span>{isUploading ? 'Uploading Image...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploading}
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">
                You can submit with or without uploading an image.
              </span>
            </div>

            {/* Attached List */}
            {attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img src={att.url} alt="attached" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-800" />
                      <span className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-[300px]">{att.fileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-slate-900"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer CTAs */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Problem Report
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
