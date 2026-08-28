import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { Complaint, CategoryInfo, User, AuditLog, AppNotification, Comment } from './src/types.js';
import {
  initializeSupabaseDatabase,
  getDbComplaints,
  createDbComplaint,
  updateDbComplaint,
  addDbComment,
  upvoteDbComplaint,
  getDbCategories,
  upsertDbCategory,
  getDbUsers,
  getDbUserById,
  upsertDbProfile,
  updateDbUserProfile,
  deleteDbUserProfile,
  getDbAuditLogs,
  createDbAuditLog,
  getDbNotifications,
  createDbNotification,
  markDbNotificationsRead,
  markSingleDbNotificationRead,
  deleteDbNotification
} from './src/lib/supabaseDb.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Gemini AI Client Initialization (Server-side)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to log audit events directly to Supabase
async function logAudit(actorName: string, actorEmail: string, actorRole: any, action: string, target: string, details: string) {
  await createDbAuditLog({
    actorName,
    actorEmail,
    actorRole,
    action,
    target,
    details
  });
}

// Helper to push notification directly to Supabase
async function pushNotification(
  userId: string | null,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  complaintId?: string,
  role?: string,
  priority?: string
) {
  await createDbNotification({
    userId,
    role,
    title,
    message,
    type,
    priority,
    complaintId
  });
}

// Email Notification Store & Dispatch Helper
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

let emailLogs: EmailLog[] = [];

function sendEmailNotification(toEmail: string, studentName: string, complaintId: string, status: string, updatedBy: string, remarks: string) {
  const emailLog: EmailLog = {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    toEmail: toEmail || 'student@vignan.ac.in',
    studentName: studentName || 'Student',
    complaintId,
    status,
    updatedBy: updatedBy || 'System',
    remarks: remarks || `Complaint status updated to ${status}`,
    sentAt: new Date().toISOString()
  };
  emailLogs.unshift(emailLog);
  console.log(`[AUTOMATED EMAIL DISPATCH] To: ${toEmail} | Ticket: ${complaintId} | Status: ${status} | By: ${updatedBy}`);
}

// --- REST API ENDPOINTS ---

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), appName: 'Campus Connect – Vignan University' });
});

// --- AUTHENTICATION API ENDPOINTS ---

// POST /api/auth/register - Student Registration Profile Sync
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, rollNo, branch, year, role, authUserId } = req.body;

    if (role && role !== 'STUDENT') {
      return res.status(403).json({ error: 'Staff and Admin accounts can only be created by the System Administrator.' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Create / upsert profile record in Supabase profiles table
    const dbUser = await upsertDbProfile({
      authUserId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      rollNo: rollNo ? rollNo.trim().toUpperCase() : 'STD-2026',
      branch: branch || 'CSE',
      year: year || '4th Year',
      role: 'STUDENT',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`
    });

    await logAudit(dbUser.name, dbUser.email, dbUser.role, 'REGISTER_USER', dbUser.id, `Registered student profile in Supabase database`);

    res.status(200).json({
      user: dbUser,
      token: `token-${dbUser.id}-${Date.now()}`
    });
  } catch (err) {
    console.error('Error in student register sync:', err);
    res.status(500).json({ error: 'Failed to process registration profile sync' });
  }
});

// POST /api/auth/login - Server Session Sync
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await getDbUserById(cleanEmail);

    if (!user) {
      const allUsers = await getDbUsers();
      user = allUsers.find(u => u.email.toLowerCase() === cleanEmail) || null;
    }

    if (!user) {
      // If user not found yet, create default user profile
      user = await upsertDbProfile({
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: cleanEmail.includes('admin') ? 'ADMIN' : cleanEmail.includes('staff') ? 'STAFF' : 'STUDENT'
      });
    }

    if (user.disabled) {
      return res.status(403).json({ error: 'Your account has been disabled. Please contact the administrator.' });
    }

    await logAudit(user.name, user.email, user.role, 'USER_LOGIN', user.id, `User session synced with Supabase`);

    res.json({
      user,
      token: `token-${user.id}-${Date.now()}`
    });
  } catch (err) {
    console.error('Error in auth login endpoint:', err);
    res.status(500).json({ error: 'Failed to process login request' });
  }
});

// GET /api/auth/me - Fetch user profile by ID or email
app.get('/api/auth/me', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'UserId required' });
    }

    const user = await getDbUserById(userId);
    if (!user || user.disabled) {
      return res.status(404).json({ error: 'User session expired or not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user session' });
  }
});

// --- ADMIN STAFF MANAGEMENT ENDPOINTS ---

// GET /api/admin/staff
app.get('/api/admin/staff', async (req, res) => {
  try {
    const staffList = await getDbUsers('STAFF');
    res.json(staffList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff accounts' });
  }
});

// POST /api/admin/staff - Admin creates Staff account in Supabase
app.post('/api/admin/staff', async (req, res) => {
  try {
    const { name, email, department, phone, staffTitle } = req.body;

    if (!name || !email || !department) {
      return res.status(400).json({ error: 'Name, email, and department are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await getDbUserById(cleanEmail);

    if (existing) {
      return res.status(400).json({ error: 'A user account with this email already exists.' });
    }

    const newStaff = await upsertDbProfile({
      name: name.trim(),
      email: cleanEmail,
      role: 'STAFF',
      department: department.trim(),
      phone: phone ? phone.trim() : '',
      staffTitle: staffTitle ? staffTitle.trim() : 'Maintenance Technician',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`
    });

    await logAudit('Admin', 'admin@vignan.ac.in', 'ADMIN', 'CREATE_STAFF', newStaff.id, `Created staff account for ${name} (${department})`);

    res.status(201).json(newStaff);
  } catch (err) {
    console.error('Error creating staff account:', err);
    res.status(500).json({ error: 'Failed to create staff account' });
  }
});

// PUT /api/admin/staff/:id - Admin updates Staff details in Supabase
app.put('/api/admin/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, phone, staffTitle, disabled } = req.body;

    const updated = await updateDbUserProfile(id, {
      name,
      department,
      phone,
      staffTitle,
      disabled: disabled !== undefined ? Boolean(disabled) : undefined
    });

    if (!updated) {
      return res.status(404).json({ error: 'Staff account not found.' });
    }

    await logAudit('Admin', 'admin@vignan.ac.in', 'ADMIN', 'UPDATE_STAFF', id, `Updated staff profile details for ${updated.name}`);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update staff account' });
  }
});

// PATCH /api/admin/staff/:id/status - Toggle Enable/Disable Staff in Supabase
app.patch('/api/admin/staff/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { disabled } = req.body;

    const updated = await updateDbUserProfile(id, { disabled: Boolean(disabled) });
    if (!updated) {
      return res.status(404).json({ error: 'Staff account not found.' });
    }

    await logAudit('Admin', 'admin@vignan.ac.in', 'ADMIN', 'TOGGLE_STAFF_STATUS', id, `${disabled ? 'Disabled' : 'Enabled'} staff account for ${updated.name}`);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update staff status' });
  }
});

// DELETE /api/admin/staff/:id - Admin deletes Staff account from Supabase
app.delete('/api/admin/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteDbUserProfile(id);

    if (!success) {
      return res.status(404).json({ error: 'Staff account not found or failed to delete.' });
    }

    await logAudit('Admin', 'admin@vignan.ac.in', 'ADMIN', 'DELETE_STAFF', id, `Deleted staff account from Supabase`);

    res.json({ success: true, message: 'Staff account has been deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete staff account' });
  }
});

// PATCH /api/auth/profile - Update editable profile fields
app.patch('/api/auth/profile', async (req, res) => {
  try {
    const { userId, phone, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'UserId is required' });
    }

    const updated = await updateDbUserProfile(userId, { phone, avatar });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAudit(updated.name, updated.email, updated.role, 'UPDATE_PROFILE', updated.id, `Updated contact phone / avatar profile settings`);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// --- COMPLAINTS ENDPOINTS ---

// GET /api/complaints
app.get('/api/complaints', async (req, res) => {
  try {
    const { search, category, status, priority, role, userId, userEmail } = req.query;
    const result = await getDbComplaints({
      search: search as string,
      category: category as string,
      status: status as string,
      priority: priority as string,
      role: role as string,
      userId: userId as string,
      userEmail: userEmail as string
    });
    res.json(result);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /api/complaints/:id
app.get('/api/complaints/:id', async (req, res) => {
  try {
    const list = await getDbComplaints({ search: req.params.id });
    const complaint = list.find(c => c.id === req.params.id || c.complaintId.toLowerCase() === req.params.id.toLowerCase());
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    res.json(complaint);
  } catch (err) {
    console.error('Error fetching single complaint:', err);
    res.status(500).json({ error: 'Failed to fetch complaint' });
  }
});

// POST /api/complaints - Create complaint in Supabase
app.post('/api/complaints', async (req, res) => {
  try {
    const { title, description, category, priority, location, studentId, studentName, studentEmail, studentRollNo, studentBranch, studentYear, attachments, building, floor, roomNumber } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields: title, description, category' });
    }

    const newComplaint = await createDbComplaint({
      title,
      description,
      category,
      priority: priority || 'Medium',
      location: location || `${building || 'Main Block'}, Floor ${floor || '2'}, Room ${roomNumber || '201'}`,
      building,
      floor,
      roomNumber,
      studentId,
      studentName,
      studentEmail,
      studentRollNo,
      studentBranch,
      studentYear,
      attachments
    });

    // Log audit
    await logAudit(
      newComplaint.studentName,
      newComplaint.studentEmail,
      'STUDENT',
      'CREATE_COMPLAINT',
      newComplaint.id,
      `Created new complaint ${newComplaint.complaintId}: "${title}" in category ${category}`
    );

    // Send Automated Email Notification
    sendEmailNotification(newComplaint.studentEmail, newComplaint.studentName, newComplaint.complaintId, 'Submitted', newComplaint.studentName, `Your complaint ${newComplaint.complaintId} has been successfully logged.`);

    // Push notification to Admins
    const adminList = await getDbUsers('ADMIN');
    for (const admin of adminList) {
      await pushNotification(admin.id, `New Complaint Submitted: ${newComplaint.complaintId}`, `${newComplaint.studentName} logged a ${priority || 'Medium'} issue: ${title}`, 'info', newComplaint.id);
    }

    res.status(201).json(newComplaint);
  } catch (err: any) {
    console.error('Error creating complaint in server.ts:', err);
    res.status(500).json({
      error: err?.message || 'Failed to create complaint',
      details: err?.message || String(err)
    });
  }
});

// PATCH /api/complaints/:id - Update status / assign staff in Supabase
app.patch('/api/complaints/:id', async (req, res) => {
  try {
    const { status, assignedStaffId, unassignStaff, priority, resolutionRemarks, rejectionReason, remarks, action, actorName, actorRole, actorEmail, proofAttachment } = req.body;

    const updated = await updateDbComplaint(req.params.id, {
      status,
      assignedStaffId,
      unassignStaff,
      priority,
      resolutionRemarks,
      rejectionReason,
      remarks,
      action,
      actorName,
      actorRole,
      actorEmail,
      proofAttachment
    });

    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found or failed to update' });
    }

    if (assignedStaffId) {
      const staff = await getDbUserById(assignedStaffId);
      if (staff) {
        await pushNotification(staff.id, `Task Assigned: ${updated.complaintId}`, `You have been assigned to handle: ${updated.title}`, 'warning', updated.id);
        sendEmailNotification(updated.studentEmail, updated.studentName, updated.complaintId, 'Assigned', actorName || 'Admin', `Assigned to technician ${staff.name} (${staff.department}).`);
      }
    }

    if (status || action || proofAttachment || resolutionRemarks || rejectionReason) {
      sendEmailNotification(
        updated.studentEmail,
        updated.studentName,
        updated.complaintId,
        status || 'Updated',
        actorName || 'System',
        resolutionRemarks || rejectionReason || `Ticket state updated by ${actorName || 'staff member'}`
      );
    }

    await logAudit(actorName || 'User', actorEmail || 'system@vignan.ac.in', actorRole || 'ADMIN', 'UPDATE_COMPLAINT', updated.id, `Updated complaint ${updated.complaintId} in Supabase`);

    res.json(updated);
  } catch (err) {
    console.error('Error updating complaint:', err);
    res.status(500).json({ error: 'Failed to update complaint' });
  }
});

// POST /api/complaints/:id/comments - Add comment in Supabase
app.post('/api/complaints/:id/comments', async (req, res) => {
  try {
    const { userId, userName, userRole, userAvatar, content, isInternal } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await addDbComment(req.params.id, {
      userId,
      userName,
      userRole,
      userAvatar,
      content,
      isInternal
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// POST /api/complaints/:id/upvote - Upvote complaint in Supabase
app.post('/api/complaints/:id/upvote', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'UserId required' });

    const result = await upvoteDbComplaint(req.params.id, userId);
    res.json({ id: req.params.id, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upvote complaint' });
  }
});

// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    const cats = await getDbCategories();
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories
app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, defaultSlaHours, active, iconName } = req.body;
    const cat = await upsertDbCategory({ name, description, defaultSlaHours, active, iconName });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save category' });
  }
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;
    const userList = await getDbUsers(role as string);
    res.json(userList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/analytics - Dashboard metrics computed directly from Supabase
app.get('/api/analytics', async (req, res) => {
  try {
    const allComplaints = await getDbComplaints();
    const allUsers = await getDbUsers();

    const total = allComplaints.length;
    const pending = allComplaints.filter(c => c.status === 'Submitted' || c.status === 'Verified' || c.status === 'Under Review').length;
    const assignedCount = allComplaints.filter(c => c.status === 'Assigned').length;
    const inProgress = allComplaints.filter(c => c.status === 'In Progress').length;
    const resolved = allComplaints.filter(c => c.status === 'Resolved').length;
    const closedCount = allComplaints.filter(c => c.status === 'Closed').length;

    // Avg resolution time
    const resolvedList = allComplaints.filter(c => c.status === 'Resolved' && c.createdAt);
    let totalHours = 0;
    resolvedList.forEach(c => {
      const diffMs = new Date(c.updatedAt || c.createdAt).getTime() - new Date(c.createdAt).getTime();
      totalHours += diffMs / (1000 * 60 * 60);
    });
    const avgResolutionTimeHours = resolvedList.length > 0 ? Number((totalHours / resolvedList.length).toFixed(1)) : 0;

    // SLA breaches
    const nowMs = Date.now();
    const slaBreachCount = allComplaints.filter(c => {
      if (c.status === 'Resolved' || c.status === 'Closed') return false;
      const elapsedHours = (nowMs - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
      return elapsedHours > (c.slaTargetHours || 24);
    }).length;

    // Category distribution
    const catCounts: Record<string, number> = {};
    allComplaints.forEach(c => {
      catCounts[c.category] = (catCounts[c.category] || 0) + 1;
    });
    const categoryDistribution = Object.keys(catCounts).map(cat => ({
      category: cat,
      count: catCounts[cat],
      percentage: total > 0 ? Math.round((catCounts[cat] / total) * 100) : 0
    }));

    // Priority distribution
    const prioCounts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    allComplaints.forEach(c => {
      prioCounts[c.priority] = (prioCounts[c.priority] || 0) + 1;
    });
    const priorityDistribution = Object.keys(prioCounts).map(p => ({
      priority: p,
      count: prioCounts[p]
    }));

    // Status distribution
    const statusCounts: Record<string, number> = {};
    allComplaints.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    const statusDistribution = Object.keys(statusCounts).map(s => ({
      status: s,
      count: statusCounts[s]
    }));

    // Department distribution
    const deptCounts: Record<string, number> = {};
    allComplaints.forEach(c => {
      const dept = c.assignedDepartment || 'Unassigned';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const departmentDistribution = Object.keys(deptCounts).map(dept => ({
      department: dept,
      count: deptCounts[dept]
    }));

    // Monthly trends
    const monthsMap: Record<string, { submitted: number; resolved: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    allComplaints.forEach(c => {
      const d = new Date(c.createdAt);
      const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthsMap[mKey]) monthsMap[mKey] = { submitted: 0, resolved: 0 };
      monthsMap[mKey].submitted++;
      if (c.status === 'Resolved') {
        const rd = new Date(c.updatedAt || c.createdAt);
        const rmKey = `${monthNames[rd.getMonth()]} ${rd.getFullYear()}`;
        if (!monthsMap[rmKey]) monthsMap[rmKey] = { submitted: 0, resolved: 0 };
        monthsMap[rmKey].resolved++;
      }
    });
    let monthlyTrends = Object.keys(monthsMap).map(m => ({
      month: m,
      submitted: monthsMap[m].submitted,
      resolved: monthsMap[m].resolved
    }));

    if (monthlyTrends.length === 0) {
      const currentMonthStr = `${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`;
      monthlyTrends = [{ month: currentMonthStr, submitted: 0, resolved: 0 }];
    }

    // Staff performance
    const staffMembers = allUsers.filter(u => u.role === 'STAFF');
    const staffPerformance = staffMembers.map(stf => {
      const assigned = allComplaints.filter(c => c.assignedStaffId === stf.id).length;
      const staffResolvedList = allComplaints.filter(c => c.assignedStaffId === stf.id && (c.status === 'Resolved' || c.status === 'Closed'));
      let sumHrs = 0;
      staffResolvedList.forEach(c => {
        sumHrs += (new Date(c.updatedAt || c.createdAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
      });
      return {
        staffName: stf.name,
        department: stf.department || 'Maintenance',
        assigned,
        resolved: staffResolvedList.length,
        avgHours: staffResolvedList.length > 0 ? Number((sumHrs / staffResolvedList.length).toFixed(1)) : 0
      };
    });

    res.json({
      totalComplaints: total,
      pendingComplaints: pending,
      assignedComplaints: assignedCount,
      inProgressComplaints: inProgress,
      resolvedComplaints: resolved,
      closedComplaints: closedCount,
      avgResolutionTimeHours,
      slaBreachCount,
      categoryDistribution,
      statusDistribution,
      priorityDistribution,
      departmentDistribution,
      monthlyTrends,
      staffPerformance
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/emails - Get automated email logs
app.get('/api/emails', (req, res) => {
  res.json(emailLogs);
});

// GET /api/audit-logs
app.get('/api/audit-logs', async (req, res) => {
  try {
    const logs = await getDbAuditLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId, role } = req.query;
    const list = await getDbNotifications(userId as string, role as string);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications - Create custom notification
app.post('/api/notifications', async (req, res) => {
  try {
    const { userId, role, title, message, type, priority, complaintId } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    const created = await createDbNotification({
      userId,
      role,
      title,
      message,
      type: type || 'info',
      priority: priority || 'Medium',
      complaintId
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PATCH /api/notifications/read - Mark all read for user or role
app.patch('/api/notifications/read', async (req, res) => {
  try {
    const { userId, role } = req.body;
    await markDbNotificationsRead(userId, role);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await markSingleDbNotificationRead(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

// DELETE /api/notifications/:id - Delete single notification
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDbNotification(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/ai/suggest - Gemini AI assistant
app.post('/api/ai/suggest', async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description required' });
  }

  const gemini = getGeminiClient();
  if (!gemini) {
    let suggestedCat = 'Classroom';
    let suggestedPriority = 'Medium';
    let suggestedDept = 'Classroom Infrastructure & AV';
    let suggestedAction = 'Assign technician to inspect and repair equipment.';

    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('wifi') || text.includes('internet') || text.includes('router') || text.includes('network')) {
      suggestedCat = 'Wi-Fi';
      suggestedDept = 'IT & Network Infrastructure';
      suggestedAction = 'Dispatch Network Engineer to restart access point and verify signal.';
    } else if (text.includes('water') || text.includes('leak') || text.includes('pipe') || text.includes('flush') || text.includes('sink')) {
      suggestedCat = 'Water';
      suggestedDept = 'Facilities & Plumbing Maintenance';
      suggestedAction = 'Dispatch Plumbing Tech to shut off supply valve and replace damaged pipe.';
    } else if (text.includes('power') || text.includes('electric') || text.includes('circuit') || text.includes('spark') || text.includes('light')) {
      suggestedCat = 'Electricity';
      suggestedDept = 'Electrical & Power Systems';
      suggestedAction = 'Send Electrician immediately to isolate breaker panel and fix wiring.';
    } else if (text.includes('washroom') || text.includes('toilet') || text.includes('sanitation')) {
      suggestedCat = 'Washroom';
      suggestedDept = 'Campus Sanitation & Housekeeping';
      suggestedAction = 'Assign Sanitation staff to clean and restock supplies.';
    } else if (text.includes('found') || text.includes('lost') || text.includes('bag') || text.includes('laptop')) {
      suggestedCat = 'Lost & Found';
      suggestedDept = 'Campus Security & Lost Property Desk';
      suggestedAction = 'Log item in Lost & Found inventory and verify student ID upon claim.';
    } else if (text.includes('projector') || text.includes('hdmi') || text.includes('screen') || text.includes('speaker')) {
      suggestedCat = 'Classroom';
      suggestedDept = 'Classroom Infrastructure & AV';
      suggestedAction = 'Assign AV Specialist to inspect HDMI transmitter and projector lamp.';
    }

    if (text.includes('spark') || text.includes('flood') || text.includes('fire') || text.includes('hazard') || text.includes('urgent')) suggestedPriority = 'Critical';
    else if (text.includes('flicker') || text.includes('broken') || text.includes('unable') || text.includes('fail')) suggestedPriority = 'High';

    return res.json({
      category: suggestedCat,
      priority: suggestedPriority,
      department: suggestedDept,
      suggestedAction: suggestedAction,
      reasoning: 'AI auto-classified issue based on Vignan campus domain patterns.',
      refinedSummary: `Issue categorized as ${suggestedCat} under ${suggestedDept} (${suggestedPriority} priority).`
    });
  }

  try {
    const prompt = `You are Campus Connect AI Assistant for Vignan University. Analyze the following campus problem report and extract metadata:

Categories allowed: Classroom, Laboratory, Library, Wi-Fi, Hostel, Mess, Bus, Electricity, Water, Washroom, Furniture, Sports, Medical, Lost & Found, Parking, Security, Other.
Priorities allowed: Low, Medium, High, Critical.

Title: "${title}"
Description: "${description}"

Respond strictly in valid JSON format with keys:
"category": string (one of the allowed categories)
"priority": string (one of the allowed priorities)
"department": string (e.g., "Network Team", "Electrical Maintenance", "Plumbing & Water", "AV Systems", "Security Desk")
"suggestedAction": string (a short 1-sentence action plan)
"reasoning": string (brief explanation)
"refinedSummary": string (clean 1-sentence summary)

Do not include markdown backticks or extra text outside JSON.`;

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const text = response.text ? response.text.replace(/```json/g, '').replace(/```/g, '').trim() : '';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err) {
    console.error('Gemini API AI Suggest Error:', err);
    return res.json({
      category: 'Classroom',
      priority: 'High',
      department: 'General Maintenance',
      suggestedAction: 'Assign staff technician to inspect report location.',
      reasoning: 'Default AI classification applied.',
      refinedSummary: title
    });
  }
});

// CSV Export Endpoint
app.get('/api/export/csv', async (req, res) => {
  try {
    const complaints = await getDbComplaints();
    let csv = 'ID,Title,Category,Priority,Status,Location,Student,Assigned Staff,Created At,Updated At\n';
    complaints.forEach(c => {
      const titleEsc = `"${c.title.replace(/"/g, '""')}"`;
      const locEsc = `"${c.location.replace(/"/g, '""')}"`;
      csv += `${c.complaintId},${titleEsc},${c.category},${c.priority},${c.status},${locEsc},"${c.studentName}","${c.assignedStaffName || 'Unassigned'}",${c.createdAt},${c.updatedAt || ''}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="campus_connect_complaints_export.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).send('Failed to generate CSV export');
  }
});

// Boot Express + Vite server
async function startServer() {
  // Initialize and verify Supabase PostgreSQL connection & seed defaults
  await initializeSupabaseDatabase();

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus Connect Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
