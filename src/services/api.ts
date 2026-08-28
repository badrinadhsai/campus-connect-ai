import { Complaint, CategoryInfo, User, AuditLog, AppNotification, AnalyticsSummary, Comment } from '../types';

export const apiService = {
  // Fetch Complaints
  async getComplaints(params?: { search?: string; category?: string; status?: string; priority?: string; role?: string; userId?: string; userEmail?: string }): Promise<Complaint[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.role) query.append('role', params.role);
    if (params?.userId) query.append('userId', params.userId);
    if (params?.userEmail) query.append('userEmail', params.userEmail);

    const res = await fetch(`/api/complaints?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch complaints');
    return res.json();
  },

  // Get Single Complaint
  async getComplaint(id: string): Promise<Complaint> {
    const res = await fetch(`/api/complaints/${id}`);
    if (!res.ok) throw new Error('Complaint not found');
    return res.json();
  },

  // Create Complaint
  async createComplaint(payload: Partial<Complaint>): Promise<Complaint> {
    const res = await fetch('/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ error: 'Failed to create complaint' }));
      const errorMsg = errJson.error || errJson.details || `Server error (${res.status})`;
      console.error('[API createComplaint error response]', errJson);
      throw new Error(errorMsg);
    }
    return res.json();
  },

  // Update Complaint Status or Staff Assignment
  async updateComplaint(id: string, payload: {
    status?: string;
    assignedStaffId?: string | null;
    unassignStaff?: boolean;
    priority?: string;
    resolutionRemarks?: string;
    rejectionReason?: string;
    remarks?: string;
    action?: string;
    actorName?: string;
    actorRole?: string;
    actorEmail?: string;
    proofAttachment?: { url: string; fileName?: string };
  }): Promise<Complaint> {
    const res = await fetch(`/api/complaints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update complaint');
    return res.json();
  },

  // Add Comment
  async addComment(complaintId: string, payload: {
    userId: string;
    userName: string;
    userRole: string;
    userAvatar?: string;
    content: string;
    isInternal?: boolean;
    attachments?: any[];
  }): Promise<Comment> {
    const res = await fetch(`/api/complaints/${complaintId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to add comment');
    return res.json();
  },

  // Toggle Upvote
  async toggleUpvote(complaintId: string, userId: string): Promise<{ id: string; upvotes: number; upvotedBy: string[] }> {
    const res = await fetch(`/api/complaints/${complaintId}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to upvote');
    return res.json();
  },

  // Get Categories
  async getCategories(): Promise<CategoryInfo[]> {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  // Get Users / Staff
  async getUsers(role?: string): Promise<User[]> {
    const query = role ? `?role=${role}` : '';
    const res = await fetch(`/api/users${query}`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  // Get Analytics
  async getAnalytics(): Promise<AnalyticsSummary> {
    const res = await fetch('/api/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Get Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Get Automated Email Logs
  async getEmailLogs(): Promise<any[]> {
    const res = await fetch('/api/emails');
    if (!res.ok) throw new Error('Failed to fetch email logs');
    return res.json();
  },

  // Get Notifications
  async getNotifications(userId?: string, role?: string): Promise<AppNotification[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (role) params.append('role', role);
    const res = await fetch(`/api/notifications?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  // Mark all notifications read
  async markNotificationsRead(userId?: string, role?: string): Promise<void> {
    await fetch('/api/notifications/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role })
    });
  },

  // Mark single notification as read
  async markNotificationAsRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH'
    });
  },

  // Delete single notification
  async deleteNotification(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}`, {
      method: 'DELETE'
    });
  },

  // Create notification
  async createNotification(payload: {
    userId?: string;
    role?: string;
    title: string;
    message: string;
    type?: string;
    priority?: string;
    complaintId?: string;
  }): Promise<AppNotification> {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create notification');
    return res.json();
  },

  // --- AUTHENTICATION API METHODS ---
  async registerStudent(payload: {
    authUserId?: string;
    name: string;
    email: string;
    phone: string;
    rollNo: string;
    branch: string;
    year: string;
    password?: string;
  }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, role: 'STUDENT' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async login(email: string, password?: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Invalid email or password.' }));
      throw new Error(err.error || 'Invalid email or password.');
    }
    return res.json();
  },

  async changePassword(userId: string, newPassword: string, oldPassword?: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword, oldPassword })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to change password' }));
      throw new Error(err.error || 'Failed to change password');
    }
    return res.json();
  },

  // --- ADMIN STAFF MANAGEMENT API METHODS ---
  async getStaffList(): Promise<User[]> {
    const res = await fetch('/api/admin/staff');
    if (!res.ok) throw new Error('Failed to fetch staff list');
    return res.json();
  },

  async createStaff(payload: {
    name: string;
    email: string;
    department: string;
    phone?: string;
    password?: string;
    staffTitle?: string;
  }): Promise<User> {
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create staff account' }));
      throw new Error(err.error || 'Failed to create staff account');
    }
    return res.json();
  },

  async updateStaff(id: string, payload: {
    name?: string;
    department?: string;
    phone?: string;
    staffTitle?: string;
    disabled?: boolean;
  }): Promise<User> {
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update staff' }));
      throw new Error(err.error || 'Failed to update staff');
    }
    return res.json();
  },

  async toggleStaffStatus(id: string, disabled: boolean): Promise<User> {
    const res = await fetch(`/api/admin/staff/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update status' }));
      throw new Error(err.error || 'Failed to update status');
    }
    return res.json();
  },

  async deleteStaff(id: string): Promise<void> {
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete staff account' }));
      throw new Error(err.error || 'Failed to delete staff account');
    }
  },

  async resetStaffPassword(id: string, newPassword: string): Promise<void> {
    const res = await fetch(`/api/admin/staff/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to reset staff password' }));
      throw new Error(err.error || 'Failed to reset staff password');
    }
  },

  async getCurrentUser(userId: string): Promise<User> {
    const res = await fetch(`/api/auth/me?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch profile session');
    return res.json();
  },

  async getMe(token: string): Promise<User> {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to restore session');
    return res.json();
  },

  async updateProfile(payload: { userId: string; phone?: string; avatar?: string; password?: string }): Promise<User> {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Password reset request failed');
    }
    return res.json();
  },

  async resetPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Password reset failed');
    }
    return res.json();
  },

  // AI Suggestion
  async suggestAIFields(title: string, description: string): Promise<{
    category: string;
    priority: string;
    department?: string;
    suggestedAction?: string;
    reasoning: string;
    refinedSummary?: string;
  }> {
    const res = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    if (!res.ok) throw new Error('Failed to generate AI suggestion');
    return res.json();
  }
};
