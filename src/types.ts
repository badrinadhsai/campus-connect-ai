export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';

export type ComplaintStatus = 
  | 'Submitted' 
  | 'Verified' 
  | 'Under Review' 
  | 'Assigned' 
  | 'In Progress' 
  | 'Resolved' 
  | 'Rejected' 
  | 'Closed';

export type ComplaintPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type ComplaintCategory = 
  | 'Classroom'
  | 'Laboratory'
  | 'Library'
  | 'Wi-Fi'
  | 'Hostel'
  | 'Mess'
  | 'Bus'
  | 'Electricity'
  | 'Water'
  | 'Washroom'
  | 'Furniture'
  | 'Sports'
  | 'Medical'
  | 'Lost & Found'
  | 'Parking'
  | 'Security'
  | 'Other'
  | string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
  phone?: string;
  rollNo?: string;
  branch?: string;
  year?: string;
  staffTitle?: string;
  disabled?: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  authUserId?: string;
}

export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  isResolutionProof?: boolean;
}

export interface Comment {
  id: string;
  complaintId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userAvatar?: string;
  content: string;
  attachments?: Attachment[];
  createdAt: string;
  isInternal?: boolean;
}

export interface ActivityTimeline {
  id: string;
  complaintId: string;
  title: string;
  description: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  statusChange?: ComplaintStatus;
}

export interface Complaint {
  id: string;
  complaintId: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  location: string;
  building?: string;
  floor?: string;
  roomNumber?: string;
  imageUrl?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRollNo?: string;
  studentBranch?: string;
  studentYear?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedDepartment?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaTargetHours: number;
  resolutionRemarks?: string;
  rejectionReason?: string;
  attachments: Attachment[];
  comments: Comment[];
  timeline: ActivityTimeline[];
  upvotes: number;
  upvotedBy: string[];
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  defaultSlaHours: number;
  active: boolean;
  assignedStaffCount: number;
  iconName: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  target: string;
  details: string;
  ipAddress?: string;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  userId?: string | null;
  role?: UserRole | 'ALL';
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority?: ComplaintPriority;
  read: boolean;
  complaintId?: string;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  toEmail: string;
  studentName: string;
  complaintId: string;
  status: string;
  updatedBy: string;
  remarks: string;
  sentAt: string;
}

export interface AnalyticsSummary {
  totalComplaints: number;
  pendingComplaints: number;
  assignedComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  closedComplaints: number;
  avgResolutionTimeHours: number;
  slaBreachCount: number;
  categoryDistribution: { category: string; count: number; percentage: number }[];
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
  monthlyTrends: { month: string; submitted: number; resolved: number }[];
  departmentDistribution: { department: string; count: number }[];
  staffPerformance: { staffName: string; department: string; assigned: number; resolved: number; avgHours: number }[];
}
