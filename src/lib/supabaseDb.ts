import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Complaint,
  CategoryInfo,
  User,
  AuditLog,
  AppNotification,
  Comment,
  ActivityTimeline,
  UserRole,
  ComplaintStatus,
  ComplaintPriority,
  ComplaintCategory
} from '../types';
import { INITIAL_CATEGORIES } from '../data/initialData';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const isDbConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-supabase') &&
  !supabaseKey.includes('your-supabase')
);

export const supabaseServerClient: SupabaseClient | null = isDbConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ====================================================================
// DATABASE INITIALIZATION & AUTOMATIC TABLE SEEDING
// ====================================================================
export async function initializeSupabaseDatabase(): Promise<void> {
  if (!supabaseServerClient) {
    console.log('[Supabase DB Server] Warning: Supabase client not initialized.');
    return;
  }

  console.log('[Supabase DB Server] Initializing and verifying Supabase PostgreSQL database tables...');
  try {
    // 1. Categories Table Verification & Seeding
    const { data: existingCats, error: catErr } = await supabaseServerClient
      .from('categories')
      .select('name');

    if (!catErr && (!existingCats || existingCats.length === 0)) {
      console.log('[Supabase DB Server] Seeding default categories in Supabase...');
      for (const cat of INITIAL_CATEGORIES) {
        await supabaseServerClient.from('categories').upsert({
          name: cat.name,
          icon: cat.iconName || 'HelpCircle',
          description: cat.description,
          sla_hours: cat.defaultSlaHours || 24,
          color: 'indigo',
          active: true
        }, { onConflict: 'name' });
      }
    }

    // 2. Default Admin Profile Verification
    const { data: adminProfile } = await supabaseServerClient
      .from('profiles')
      .select('id')
      .eq('email', 'admin@vignan.ac.in')
      .maybeSingle();

    if (!adminProfile) {
      await supabaseServerClient.from('profiles').insert({
        full_name: 'Chief Campus Administrator',
        email: 'admin@vignan.ac.in',
        role: 'admin',
        branch: 'Administration',
        phone: '9876543212'
      });
    }

    // 3. Default Staff Account Verification
    const { data: staffProfile } = await supabaseServerClient
      .from('profiles')
      .select('id')
      .eq('email', 'rajesh.kumar@campus.edu')
      .maybeSingle();

    if (!staffProfile) {
      const { data: newStaffProf } = await supabaseServerClient.from('profiles').insert({
        full_name: 'Dr. Rajesh Kumar',
        email: 'rajesh.kumar@campus.edu',
        role: 'staff',
        branch: 'Electrical Maintenance',
        phone: '9876543211'
      }).select().single();

      if (newStaffProf) {
        await supabaseServerClient.from('staff_accounts').upsert({
          profile_id: newStaffProf.id,
          department: 'Electrical Maintenance',
          staff_title: 'Senior Maintenance Engineer',
          disabled: false
        }, { onConflict: 'profile_id' });
      }
    }

    console.log('[Supabase DB Server] PostgreSQL tables and initial records ready.');
  } catch (err) {
    console.warn('[Supabase DB Server] Note during init:', err);
  }
}

// ====================================================================
// 1. PROFILES & USERS
// ====================================================================
export async function getDbUsers(role?: string): Promise<User[]> {
  if (!supabaseServerClient) return [];
  try {
    let query = supabaseServerClient.from('profiles').select('*');
    if (role) {
      query = query.eq('role', role.toLowerCase());
    }
    const { data, error } = await query;
    if (error || !data) return [];

    // Fetch staff account details if any
    const { data: staffData } = await supabaseServerClient.from('staff_accounts').select('*');
    const staffMap = new Map((staffData || []).map(s => [s.profile_id, s]));

    return data.map(p => {
      const staffInfo = staffMap.get(p.id);
      return {
        id: p.id,
        name: p.full_name || p.email.split('@')[0],
        email: p.email,
        role: (p.role ? p.role.toUpperCase() : 'STUDENT') as UserRole,
        department: staffInfo?.department || p.branch || 'Campus',
        staffTitle: staffInfo?.staff_title || (p.role === 'staff' ? 'Technician' : undefined),
        phone: p.phone || '',
        rollNo: p.roll_number || '',
        branch: p.branch || '',
        year: p.year || '',
        avatar: p.profile_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name || p.email)}`,
        disabled: Boolean(p.disabled || staffInfo?.disabled),
        createdAt: p.created_at
      };
    });
  } catch (err) {
    console.error('getDbUsers error:', err);
    return [];
  }
}

export async function getDbUserById(id: string): Promise<User | null> {
  if (!supabaseServerClient) return null;
  try {
    const { data, error } = await supabaseServerClient
      .from('profiles')
      .select('*')
      .or(`id.eq.${id},auth_user_id.eq.${id},email.eq.${id}`)
      .maybeSingle();

    if (error || !data) return null;

    const { data: staffInfo } = await supabaseServerClient
      .from('staff_accounts')
      .select('*')
      .eq('profile_id', data.id)
      .maybeSingle();

    return {
      id: data.id,
      name: data.full_name || data.email.split('@')[0],
      email: data.email,
      role: (data.role ? data.role.toUpperCase() : 'STUDENT') as UserRole,
      department: staffInfo?.department || data.branch || 'Campus',
      staffTitle: staffInfo?.staff_title || (data.role === 'staff' ? 'Technician' : undefined),
      phone: data.phone || '',
      rollNo: data.roll_number || '',
      branch: data.branch || '',
      year: data.year || '',
      avatar: data.profile_photo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.full_name || data.email)}`,
      disabled: Boolean(data.disabled || staffInfo?.disabled),
      createdAt: data.created_at
    };
  } catch (err) {
    console.error('getDbUserById error:', err);
    return null;
  }
}

export async function upsertDbProfile(user: Partial<User> & { email: string; name: string }): Promise<User> {
  if (!supabaseServerClient) {
    throw new Error('Supabase client not connected');
  }

  const payload: any = {
    full_name: user.name,
    email: user.email.toLowerCase(),
    phone: user.phone || '',
    roll_number: user.rollNo || '',
    branch: user.branch || user.department || '',
    year: user.year || '',
    role: (user.role || 'STUDENT').toLowerCase(),
    profile_photo: user.avatar || '',
    updated_at: new Date().toISOString()
  };

  if ((user as any).auth_user_id || (user as any).authUserId) {
    payload.auth_user_id = (user as any).auth_user_id || (user as any).authUserId;
  }

  const { data, error } = await supabaseServerClient
    .from('profiles')
    .upsert(payload, { onConflict: 'email' })
    .select()
    .single();

  if (error || !data) {
    console.error('upsertDbProfile error:', error);
    throw new Error(error?.message || 'Failed to upsert profile in Supabase');
  }

  // If role is STAFF, upsert into staff_accounts
  if (user.role === 'STAFF') {
    await supabaseServerClient.from('staff_accounts').upsert({
      profile_id: data.id,
      department: user.department || 'Maintenance',
      staff_title: user.staffTitle || 'Technician',
      disabled: Boolean(user.disabled)
    }, { onConflict: 'profile_id' });
  }

  return {
    id: data.id,
    name: data.full_name,
    email: data.email,
    role: (data.role ? data.role.toUpperCase() : 'STUDENT') as UserRole,
    department: user.department || data.branch || '',
    staffTitle: user.staffTitle,
    phone: data.phone,
    rollNo: data.roll_number,
    branch: data.branch,
    year: data.year,
    avatar: data.profile_photo,
    disabled: Boolean(data.disabled),
    createdAt: data.created_at
  };
}

export async function updateDbUserProfile(id: string, updates: Partial<User>): Promise<User | null> {
  if (!supabaseServerClient) return null;

  const profileUpdates: any = {};
  if (updates.name) profileUpdates.full_name = updates.name;
  if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
  if (updates.avatar !== undefined) profileUpdates.profile_photo = updates.avatar;
  if (updates.disabled !== undefined) profileUpdates.disabled = Boolean(updates.disabled);
  if (updates.branch) profileUpdates.branch = updates.branch;
  if (updates.year) profileUpdates.year = updates.year;
  profileUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseServerClient
    .from('profiles')
    .update(profileUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;

  if (updates.department || updates.staffTitle !== undefined || updates.disabled !== undefined) {
    const { data: existingStaff } = await supabaseServerClient
      .from('staff_accounts')
      .select('id')
      .eq('profile_id', id)
      .maybeSingle();

    if (existingStaff) {
      await supabaseServerClient.from('staff_accounts').update({
        department: updates.department,
        staff_title: updates.staffTitle,
        disabled: updates.disabled
      }).eq('profile_id', id);
    }
  }

  return getDbUserById(id);
}

export async function deleteDbUserProfile(id: string): Promise<boolean> {
  if (!supabaseServerClient) return false;
  try {
    await supabaseServerClient.from('staff_accounts').delete().eq('profile_id', id);
    const { error } = await supabaseServerClient.from('profiles').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('deleteDbUserProfile error:', err);
    return false;
  }
}

// ====================================================================
// 2. CATEGORIES
// ====================================================================
export async function getDbCategories(): Promise<CategoryInfo[]> {
  if (!supabaseServerClient) return INITIAL_CATEGORIES;
  try {
    const { data, error } = await supabaseServerClient
      .from('categories')
      .select('*')
      .order('name');

    if (error || !data || data.length === 0) return INITIAL_CATEGORIES;

    return data.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      defaultSlaHours: c.sla_hours || 24,
      active: c.active !== false,
      assignedStaffCount: 2,
      iconName: c.icon || 'HelpCircle'
    }));
  } catch (err) {
    return INITIAL_CATEGORIES;
  }
}

export async function upsertDbCategory(cat: Partial<CategoryInfo> & { name: string }): Promise<CategoryInfo> {
  if (!supabaseServerClient) throw new Error('Supabase client not connected');

  const { data, error } = await supabaseServerClient
    .from('categories')
    .upsert({
      name: cat.name,
      description: cat.description || '',
      sla_hours: cat.defaultSlaHours || 24,
      icon: cat.iconName || 'HelpCircle',
      color: 'indigo',
      active: cat.active !== false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'name' })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to save category');

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    defaultSlaHours: data.sla_hours,
    active: data.active,
    assignedStaffCount: 2,
    iconName: data.icon
  };
}

// ====================================================================
// 3. COMPLAINTS & RELATED TABLES (assignments, comments, attachments, history)
// ====================================================================
export async function getDbComplaints(params?: {
  search?: string;
  category?: string;
  status?: string;
  priority?: string;
  role?: string;
  userId?: string;
  userEmail?: string;
}): Promise<Complaint[]> {
  if (!supabaseServerClient) return [];
  try {
    let query = supabaseServerClient.from('complaints').select(`
      *,
      student:student_id ( id, auth_user_id, full_name, email, roll_number, branch, year ),
      staff:assigned_staff ( id, full_name, email, branch )
    `).order('created_at', { ascending: false });

    if (params?.category && params.category !== 'All') {
      query = query.eq('category', params.category);
    }
    if (params?.status && params.status !== 'All') {
      query = query.eq('status', params.status);
    }
    if (params?.priority && params.priority !== 'All') {
      query = query.eq('priority', params.priority);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error('getDbComplaints query error:', error);
      return [];
    }

    // Fetch related comments, attachments, history for all complaints
    const complaintIds = data.map(c => c.id);

    const { data: allComments } = await supabaseServerClient
      .from('comments')
      .select('*')
      .in('complaint_id', complaintIds)
      .order('created_at', { ascending: true });

    const { data: allAttachments } = await supabaseServerClient
      .from('attachments')
      .select('*')
      .in('complaint_id', complaintIds);

    const { data: allHistory } = await supabaseServerClient
      .from('complaint_history')
      .select('*')
      .in('complaint_id', complaintIds)
      .order('created_at', { ascending: true });

    const commentsMap = new Map<string, Comment[]>();
    (allComments || []).forEach(com => {
      const list = commentsMap.get(com.complaint_id) || [];
      list.push({
        id: com.id,
        complaintId: com.complaint_id,
        userId: com.user_id || '',
        userName: com.user_name,
        userRole: (com.user_role ? com.user_role.toUpperCase() : 'STUDENT') as UserRole,
        userAvatar: com.user_avatar,
        content: com.content,
        isInternal: Boolean(com.is_internal),
        createdAt: com.created_at
      });
      commentsMap.set(com.complaint_id, list);
    });

    const attachmentsMap = new Map<string, any[]>();
    (allAttachments || []).forEach(att => {
      const list = attachmentsMap.get(att.complaint_id) || [];
      list.push({
        id: att.id,
        url: att.file_url,
        fileName: att.file_name,
        fileType: att.file_type,
        uploadedAt: att.created_at,
        isResolutionProof: Boolean(att.is_resolution_proof)
      });
      attachmentsMap.set(att.complaint_id, list);
    });

    const historyMap = new Map<string, ActivityTimeline[]>();
    (allHistory || []).forEach(hist => {
      const list = historyMap.get(hist.complaint_id) || [];
      list.push({
        id: hist.id,
        complaintId: hist.complaint_id,
        title: hist.action,
        description: hist.remarks || `${hist.action} by ${hist.actor_name}`,
        timestamp: hist.created_at,
        actorName: hist.actor_name,
        actorRole: (hist.actor_role ? hist.actor_role.toUpperCase() : 'STAFF') as UserRole,
        statusChange: hist.new_status
      });
      historyMap.set(hist.complaint_id, list);
    });

    let result: Complaint[] = data.map(c => {
      const student = c.student || {};
      const staff = c.staff || {};
      const location = `${c.building || 'Main Building'}, Floor ${c.floor || '1'}, Room ${c.room_number || '101'}`;

      const timeline: ActivityTimeline[] = historyMap.get(c.id) || [
        {
          id: `t-init-${c.id}`,
          complaintId: c.id,
          title: 'Complaint Submitted',
          description: `Logged ticket ${c.complaint_id}`,
          timestamp: c.created_at,
          actorName: student.full_name || 'Student',
          actorRole: 'STUDENT',
          statusChange: 'Submitted'
        }
      ];

      return {
        id: c.id,
        complaintId: c.complaint_id,
        studentId: c.student_id || '',
        studentName: student.full_name || 'Student',
        studentEmail: student.email || '',
        studentRollNo: student.roll_number || 'STD-2026',
        studentBranch: student.branch || 'CSE',
        studentYear: student.year || '4th Year',
        category: c.category as ComplaintCategory,
        priority: c.priority as ComplaintPriority,
        title: c.title,
        description: c.description,
        location,
        building: c.building,
        floor: c.floor,
        roomNumber: c.room_number,
        imageUrl: c.image_url || '',
        status: c.status as ComplaintStatus,
        assignedStaffId: c.assigned_staff || undefined,
        assignedStaffName: staff.full_name || undefined,
        assignedDepartment: staff.branch || undefined,
        upvotes: c.upvotes || 1,
        upvotedBy: c.upvoted_by || [],
        comments: commentsMap.get(c.id) || [],
        attachments: attachmentsMap.get(c.id) || [],
        timeline,
        slaTargetHours: 24,
        resolutionRemarks: c.resolution_remarks || undefined,
        rejectionReason: c.rejection_reason || undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        studentAuthUserId: student.auth_user_id || ''
      } as Complaint & { studentAuthUserId?: string };
    });

    // Apply role/userId filters if specified
    if (params?.role === 'STUDENT') {
      const uId = (params.userId || '').toLowerCase();
      const uEmail = (params.userEmail || '').toLowerCase();
      result = result.filter(c => {
        const cStudentId = (c.studentId || '').toLowerCase();
        const cAuthUserId = ((c as any).studentAuthUserId || '').toLowerCase();
        const cEmail = (c.studentEmail || '').toLowerCase();

        // Direct match on profile ID or auth user ID
        if (uId && (cStudentId === uId || cAuthUserId === uId)) return true;

        // Direct match on email
        if (uEmail && cEmail === uEmail) return true;
        if (uId && cEmail === uId) return true;

        // Fallback for guest student demo mode
        if (
          (uId === 'guest-student' || uEmail === 'student@campus.edu' || uEmail === 'alex.chen@campus.edu') &&
          (cEmail === 'student@campus.edu' || cEmail === 'alex.chen@campus.edu' || cStudentId === 'guest-student')
        ) {
          return true;
        }

        return false;
      });
    } else if (params?.role === 'STAFF') {
      const uId = (params.userId || '').toLowerCase();
      const uEmail = (params.userEmail || '').toLowerCase();

      result = result.filter(c => {
        if (!c.assignedStaffId) return false;
        const assigned = c.assignedStaffId.toLowerCase();
        if (uId && assigned === uId) return true;
        if (uEmail && (assigned === uEmail || (c.assignedStaffName || '').toLowerCase().includes(uEmail.split('@')[0]))) return true;
        return false;
      });
    }

    if (params?.search) {
      const s = params.search.toLowerCase();
      result = result.filter(c =>
        c.id.toLowerCase().includes(s) ||
        c.title.toLowerCase().includes(s) ||
        c.description.toLowerCase().includes(s) ||
        c.category.toLowerCase().includes(s) ||
        c.location.toLowerCase().includes(s) ||
        c.studentName.toLowerCase().includes(s)
      );
    }

    return result;
  } catch (err) {
    console.error('getDbComplaints error:', err);
    return [];
  }
}

export async function createDbComplaint(payload: any): Promise<Complaint> {
  if (!supabaseServerClient) throw new Error('Supabase client not connected');

  // Generate readable ticket ID
  const seq = Math.floor(100000 + Math.random() * 900000);
  const complaintCode = `CMP-2026-${seq}`;

  // Find or verify student profile ID
  let studentProfileId: string | null = null;

  // 1. If payload.studentId provided, test if valid UUID and query profiles by id or auth_user_id
  if (payload.studentId && typeof payload.studentId === 'string') {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.studentId);
    if (isUuid) {
      const { data: profById, error: profIdErr } = await supabaseServerClient
        .from('profiles')
        .select('id')
        .or(`id.eq.${payload.studentId},auth_user_id.eq.${payload.studentId}`)
        .maybeSingle();

      if (profIdErr) {
        console.warn('[Supabase Profile Lookup by ID Error]', profIdErr);
      }
      if (profById?.id) {
        studentProfileId = profById.id;
      }
    }
  }

  // 2. Look up profile by email if studentProfileId not resolved yet
  if (!studentProfileId && payload.studentEmail) {
    const { data: profByEmail, error: profEmailErr } = await supabaseServerClient
      .from('profiles')
      .select('id')
      .eq('email', payload.studentEmail.toLowerCase())
      .maybeSingle();

    if (profEmailErr) {
      console.warn('[Supabase Profile Lookup by Email Error]', profEmailErr);
    }
    if (profByEmail?.id) {
      studentProfileId = profByEmail.id;
    }
  }

  // 3. Auto-ensure profile exists in profiles table
  if (!studentProfileId && payload.studentEmail) {
    console.log('[Supabase] Profile not found, auto-creating profile for student:', payload.studentEmail);
    const { data: newProf, error: createProfErr } = await supabaseServerClient
      .from('profiles')
      .insert({
        email: payload.studentEmail.toLowerCase(),
        full_name: payload.studentName || payload.studentEmail.split('@')[0] || 'Student',
        roll_number: payload.studentRollNo || 'STD-2026',
        branch: payload.studentBranch || 'CSE',
        year: payload.studentYear || '4th Year',
        role: 'student'
      })
      .select('id')
      .single();

    if (createProfErr) {
      console.error('[Supabase Profile Creation Error]', createProfErr);
    }
    if (newProf?.id) {
      studentProfileId = newProf.id;
    }
  }

  // Validate required fields
  if (!payload.title || !payload.description || !payload.category) {
    throw new Error('Missing required fields: title, description, category');
  }

  const insertData = {
    complaint_id: complaintCode,
    student_id: studentProfileId,
    category: payload.category,
    priority: payload.priority || 'Medium',
    title: payload.title,
    description: payload.description,
    building: payload.building || 'Main Block',
    floor: payload.floor || '2',
    room_number: payload.roomNumber || '201',
    image_url: payload.imageUrl || (payload.attachments && payload.attachments[0]?.url) || '',
    status: 'Submitted',
    upvotes: 1,
    upvoted_by: studentProfileId ? [studentProfileId] : []
  };

  console.log('[Supabase Insert Complaint Data]:', insertData);

  const { data: inserted, error } = await supabaseServerClient
    .from('complaints')
    .insert(insertData)
    .select()
    .single();

  if (error || !inserted) {
    console.error('[Supabase Insert Complaint Error Object]:', JSON.stringify(error, null, 2));
    console.error('[Supabase Insert Error Details]:', error);
    const errorDetails = error?.details ? ` - ${error.details}` : '';
    const errorHint = error?.hint ? ` (Hint: ${error.hint})` : '';
    throw new Error(`Database error creating complaint: ${error?.message || 'Failed to insert into complaints table'}${errorDetails}${errorHint}`);
  }

  console.log('[Supabase Insert Complaint Success]:', inserted.id);

  // Insert attachments if provided
  if (payload.attachments && Array.isArray(payload.attachments)) {
    for (const att of payload.attachments) {
      const { error: attErr } = await supabaseServerClient.from('attachments').insert({
        complaint_id: inserted.id,
        file_name: att.fileName || 'attachment.jpg',
        file_url: att.url || att,
        file_type: att.fileType || 'image/jpeg',
        uploaded_by: studentProfileId || null
      });
      if (attErr) {
        console.error('[Supabase Attachment Insert Error]:', attErr);
      }
    }
  }

  // Insert complaint history record
  const { error: histErr } = await supabaseServerClient.from('complaint_history').insert({
    complaint_id: inserted.id,
    actor_name: payload.studentName || 'Student',
    actor_role: 'STUDENT',
    action: 'Complaint Logged',
    new_status: 'Submitted',
    remarks: `Ticket ${complaintCode} created in category ${payload.category}`
  });
  if (histErr) {
    console.error('[Supabase Complaint History Insert Error]:', histErr);
  }


  const all = await getDbComplaints({ search: inserted.id });
  return all[0] || {
    id: inserted.id,
    complaintId: complaintCode,
    studentId: studentProfileId || '',
    studentName: payload.studentName || 'Student',
    studentEmail: payload.studentEmail || '',
    studentRollNo: payload.studentRollNo || '211FA04001',
    studentBranch: payload.studentBranch || 'CSE',
    studentYear: payload.studentYear || '4th Year',
    category: payload.category,
    priority: payload.priority || 'Medium',
    title: payload.title,
    description: payload.description,
    location: `${payload.building || 'Main Block'}, Floor ${payload.floor || '2'}, Room ${payload.roomNumber || '201'}`,
    building: payload.building,
    floor: payload.floor,
    roomNumber: payload.roomNumber,
    imageUrl: insertData.image_url,
    status: 'Submitted',
    upvotes: 1,
    upvotedBy: [],
    comments: [],
    attachments: [],
    timeline: [],
    slaTargetHours: 24,
    createdAt: inserted.created_at,
    updatedAt: inserted.updated_at
  };
}

export async function updateDbComplaint(id: string, updates: any): Promise<Complaint | null> {
  if (!supabaseServerClient) return null;

  const dbUpdates: any = { updated_at: new Date().toISOString() };
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.priority) dbUpdates.priority = updates.priority;
  if (updates.unassignStaff || updates.assignedStaffId === null || updates.assignedStaffId === '') {
    dbUpdates.assigned_staff = null;
  } else if (updates.assignedStaffId) {
    dbUpdates.assigned_staff = updates.assignedStaffId;
  }
  if (updates.resolutionRemarks) dbUpdates.resolution_remarks = updates.resolutionRemarks;
  if (updates.rejectionReason) dbUpdates.rejection_reason = updates.rejectionReason;

  const { data: updated, error } = await supabaseServerClient
    .from('complaints')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error('updateDbComplaint error:', error);
    return null;
  }

  // Create Assignment record if staff assigned
  if (updates.assignedStaffId && !updates.unassignStaff) {
    await supabaseServerClient.from('assignments').insert({
      complaint_id: id,
      staff_id: updates.assignedStaffId,
      notes: updates.notes || 'Staff assigned to ticket',
      status: 'active'
    });
  }

  // Insert Resolution Proof Attachment if provided
  if (updates.proofAttachment) {
    await supabaseServerClient.from('attachments').insert({
      complaint_id: id,
      file_name: updates.proofAttachment.fileName || 'resolution_proof.jpg',
      file_url: updates.proofAttachment.url,
      file_type: 'image/jpeg',
      is_resolution_proof: true
    });
  }

  // Log History automatically
  const historyAction = updates.action || (
    updates.status ? `Status changed to ${updates.status}` :
    updates.assignedStaffId ? 'Assigned Technician' :
    'Complaint Updated'
  );
  const remarksText = updates.resolutionRemarks || updates.remarks || updates.rejectionReason || 'Ticket state updated';

  await supabaseServerClient.from('complaint_history').insert({
    complaint_id: id,
    actor_name: updates.actorName || 'Staff Member',
    actor_role: updates.actorRole || 'STAFF',
    action: historyAction,
    new_status: updates.status || updated.status,
    remarks: remarksText
  });

  // Log Audit Log automatically
  await createDbAuditLog({
    actorName: updates.actorName || 'Staff Member',
    actorEmail: updates.actorEmail || 'staff@campus.edu',
    actorRole: updates.actorRole || 'STAFF',
    action: historyAction,
    target: `Complaint ${updated.complaint_id || id}`,
    details: `${historyAction} for ticket ${updated.complaint_id || id}. Remarks: ${remarksText}`,
    ipAddress: '127.0.0.1'
  });

  // Notify Student in Supabase notifications table
  if (updated.student_id) {
    let complaintOwnerId = updated.student_id;
    let complaintOwnerAuthUserId = updated.student_id;

    // Load complaint owner's profile to resolve auth_user_id and id
    const { data: ownerProf } = await supabaseServerClient
      .from('profiles')
      .select('id, auth_user_id, email')
      .or(`id.eq.${updated.student_id},auth_user_id.eq.${updated.student_id}`)
      .maybeSingle();

    if (ownerProf) {
      if (ownerProf.id) complaintOwnerId = ownerProf.id;
      if (ownerProf.auth_user_id) complaintOwnerAuthUserId = ownerProf.auth_user_id;
    }

    const notificationRecipientId = complaintOwnerAuthUserId || complaintOwnerId;
    const currentStaffId = updates.actorEmail || updates.actorName || updates.assignedStaffId || 'Staff';
    const complaintCode = updated.complaint_id || id;

    let notifTitle = `Ticket Updated: ${complaintCode}`;
    let notifMessage = `Your complaint (${complaintCode}) was updated.`;
    let notifType: 'info' | 'success' | 'warning' | 'error' = updates.status === 'Resolved' ? 'success' : updates.status === 'Rejected' ? 'error' : 'info';

    if (updates.action === 'Accepted Assignment') {
      notifTitle = `Complaint Accepted: ${complaintCode}`;
      notifMessage = `Your complaint (${complaintCode}) has been accepted by the assigned staff member.`;
      notifType = 'info';
    } else if (updates.action === 'Assignment Rejected' || updates.rejectionReason) {
      notifTitle = `Assignment Reassigned: ${complaintCode}`;
      notifMessage = `Your complaint assignment (${complaintCode}) has been rejected and is being reassigned.`;
      notifType = 'warning';
    } else if (updates.action === 'Work Progress Update') {
      notifTitle = `Work Progress Update: ${complaintCode}`;
      notifMessage = `Work is in progress for your complaint (${complaintCode}). ${remarksText}`.trim();
      notifType = 'info';
    } else if (updates.status === 'Resolved') {
      notifTitle = `Complaint Resolved: ${complaintCode}`;
      notifMessage = `Your complaint (${complaintCode}) has been resolved. Please review the resolution.`;
      notifType = 'success';
    } else if (updates.proofAttachment) {
      notifTitle = `Resolution Proof Uploaded: ${complaintCode}`;
      notifMessage = `A completion proof image has been uploaded for your complaint (${complaintCode}).`;
      notifType = 'info';
    }

    console.log('[Notification Debug - Staff Action]');
    console.log(`Current Staff ID: ${currentStaffId}`);
    console.log(`Complaint Owner ID: ${complaintOwnerId}`);
    console.log(`Notification Recipient ID: ${notificationRecipientId}`);

    const createdNotif = await createDbNotification({
      userId: notificationRecipientId,
      role: 'STUDENT',
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      priority: updates.priority || 'Medium',
      complaintId: id
    });

    console.log(`Inserted Notification User ID: ${createdNotif?.userId || 'Failed'}`);
  }

  const list = await getDbComplaints({ search: id });
  return list[0] || null;
}

export async function addDbComment(complaintId: string, commentData: any): Promise<Comment> {
  if (!supabaseServerClient) throw new Error('Supabase client not connected');

  const insertData = {
    complaint_id: complaintId,
    user_id: commentData.userId || null,
    user_name: commentData.userName || 'User',
    user_role: (commentData.userRole || 'STUDENT').toLowerCase(),
    user_avatar: commentData.userAvatar || '',
    content: commentData.content,
    is_internal: Boolean(commentData.isInternal)
  };

  const { data, error } = await supabaseServerClient
    .from('comments')
    .insert(insertData)
    .select()
    .single();

  // Also mirror into complaint_comments table for schema completeness
  await supabaseServerClient.from('complaint_comments').insert(insertData);

  if (error || !data) {
    throw new Error(error?.message || 'Failed to add comment to Supabase');
  }

  return {
    id: data.id,
    complaintId: data.complaint_id,
    userId: data.user_id || '',
    userName: data.user_name,
    userRole: (data.user_role ? data.user_role.toUpperCase() : 'STUDENT') as UserRole,
    userAvatar: data.user_avatar,
    content: data.content,
    isInternal: data.is_internal,
    createdAt: data.created_at
  };
}

export async function upvoteDbComplaint(complaintId: string, userId: string): Promise<{ upvotes: number; upvotedBy: string[] }> {
  if (!supabaseServerClient) throw new Error('Supabase client not connected');

  const { data: current } = await supabaseServerClient
    .from('complaints')
    .select('upvotes, upvoted_by')
    .eq('id', complaintId)
    .single();

  let list: string[] = current?.upvoted_by || [];
  let votes = current?.upvotes || 0;

  const idx = list.indexOf(userId);
  if (idx >= 0) {
    list.splice(idx, 1);
    votes = Math.max(0, votes - 1);
  } else {
    list.push(userId);
    votes += 1;
  }

  await supabaseServerClient
    .from('complaints')
    .update({ upvotes: votes, upvoted_by: list, updated_at: new Date().toISOString() })
    .eq('id', complaintId);

  return { upvotes: votes, upvotedBy: list };
}

// ====================================================================
// 4. AUDIT LOGS
// ====================================================================
export async function getDbAuditLogs(): Promise<AuditLog[]> {
  if (!supabaseServerClient) return [];
  try {
    const { data, error } = await supabaseServerClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return data.map(l => ({
      id: l.id,
      timestamp: l.created_at || new Date().toISOString(),
      actorName: l.actor_name,
      actorEmail: l.actor_email,
      actorRole: (l.actor_role ? l.actor_role.toUpperCase() : 'ADMIN') as UserRole,
      action: l.action,
      target: l.target,
      details: l.details || '',
      ipAddress: l.ip_address || '127.0.0.1',
      createdAt: l.created_at
    }));
  } catch (err) {
    return [];
  }
}

export async function createDbAuditLog(log: any): Promise<void> {
  if (!supabaseServerClient) return;
  try {
    await supabaseServerClient.from('audit_logs').insert({
      actor_name: log.actorName || 'System',
      actor_email: log.actorEmail || 'system@vignan.ac.in',
      actor_role: (log.actorRole || 'ADMIN').toLowerCase(),
      action: log.action,
      target: log.target || 'System',
      details: log.details || '',
      ip_address: log.ipAddress || '127.0.0.1'
    });
  } catch (err) {
    console.error('createDbAuditLog error:', err);
  }
}

// ====================================================================
// 5. NOTIFICATIONS
// ====================================================================
export async function getDbNotifications(userId?: string, role?: string): Promise<AppNotification[]> {
  if (!supabaseServerClient) return [];
  try {
    let userProfileIds: string[] = [];
    let studentComplaintIds: string[] = [];

    if (userId) {
      userProfileIds.push(userId.toLowerCase());

      // Safe profile lookup avoiding invalid UUID syntax on non-UUID query params
      let prof: any = null;
      const isEmail = userId.includes('@');
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId);

      if (isEmail) {
        const { data } = await supabaseServerClient
          .from('profiles')
          .select('id, auth_user_id, email')
          .eq('email', userId.toLowerCase())
          .maybeSingle();
        prof = data;
      } else if (isUuid) {
        const { data } = await supabaseServerClient
          .from('profiles')
          .select('id, auth_user_id, email')
          .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
          .maybeSingle();
        prof = data;
      } else {
        const { data } = await supabaseServerClient
          .from('profiles')
          .select('id, auth_user_id, email')
          .eq('id', userId)
          .maybeSingle();
        prof = data;
      }

      if (prof) {
        if (prof.id) userProfileIds.push(prof.id.toLowerCase());
        if (prof.auth_user_id) userProfileIds.push(prof.auth_user_id.toLowerCase());
        if (prof.email) userProfileIds.push(prof.email.toLowerCase());
      }

      // Collect complaint IDs belonging to this student for accurate linked notification matching
      if (!role || role.toUpperCase() === 'STUDENT') {
        const { data: studentComplaints } = await supabaseServerClient
          .from('complaints')
          .select('id, complaint_id, student_id');
        
        if (studentComplaints && studentComplaints.length > 0) {
          studentComplaints.forEach(c => {
            const sid = c.student_id ? String(c.student_id).toLowerCase() : '';
            if (userProfileIds.includes(sid)) {
              if (c.id) studentComplaintIds.push(String(c.id));
              if (c.complaint_id) studentComplaintIds.push(String(c.complaint_id));
            }
          });
        }
      }
    }

    let query = supabaseServerClient
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data, error } = await query;
    if (error || !data) return [];

    let filtered = data;

    // Strict user & role notification isolation
    if (userId || role) {
      filtered = data.filter(n => {
        const notifUserId = n.user_id ? String(n.user_id).toLowerCase() : null;
        const notifComplaintId = n.complaint_id || n.related_complaint_id ? String(n.complaint_id || n.related_complaint_id) : null;

        // Direct user target match or linked complaint match
        if (notifUserId) {
          if (userId && userProfileIds.length > 0) {
            const matchesUser = userProfileIds.includes(notifUserId);
            const matchesComplaint = Boolean(notifComplaintId && studentComplaintIds.includes(notifComplaintId));
            return matchesUser || matchesComplaint;
          }
          return userId ? notifUserId === userId.toLowerCase() : false;
        }

        // If notif has complaint_id belonging to student
        if (notifComplaintId && studentComplaintIds.includes(notifComplaintId)) {
          return true;
        }

        // Broadcast to role without specific user_id
        if (role && n.role) {
          return n.role.toUpperCase() === role.toUpperCase() || n.role.toUpperCase() === 'ALL';
        }

        return !n.role || n.role.toUpperCase() === 'ALL';
      });
    }

    console.log('Current Auth User ID:', userId);
    console.log('Fetched Notification Count:', filtered.length);
    console.log('Notification User IDs:', filtered.map(n => n.user_id));

    // Requirement 6: Log if notification exists in DB for this recipient but was not included in output
    data.forEach(n => {
      const recipientId = n.user_id ? String(n.user_id) : null;
      const isDisplayed = filtered.some(f => String(f.id) === String(n.id));
      if (!isDisplayed && recipientId && userProfileIds.some(id => id === recipientId.toLowerCase())) {
        console.warn(`[Notification Warning] Notification (ID: ${n.id}) recipient (${recipientId}) exists in DB but not returned for authenticated user ID ${userId}! Query result count: ${filtered.length}`);
      }
    });

    return filtered.map(n => ({
      id: String(n.id),
      userId: n.user_id || null,
      role: (n.role ? n.role.toUpperCase() : 'ALL') as any,
      title: n.title || 'System Notification',
      message: n.message || '',
      type: (n.type || 'info') as any,
      priority: (n.priority || 'Medium') as any,
      read: Boolean(n.is_read || n.read),
      complaintId: n.complaint_id || n.related_complaint_id || undefined,
      createdAt: n.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.error('getDbNotifications error:', err);
    return [];
  }
}

export async function createDbNotification(notif: {
  userId?: string | null;
  role?: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  priority?: string;
  complaintId?: string;
}): Promise<AppNotification | null> {
  if (!supabaseServerClient) return null;
  try {
    const insertObj = {
      user_id: notif.userId || null,
      role: notif.role ? notif.role.toUpperCase() : 'ALL',
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info',
      priority: notif.priority || 'Medium',
      complaint_id: notif.complaintId || null,
      is_read: false,
      read: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseServerClient
      .from('notifications')
      .insert(insertObj)
      .select()
      .single();

    if (error) {
      console.error('[Supabase createDbNotification Error]:', error);
      // Fallback try simple insert if role or priority or is_read column missing
      const { data: fallbackData } = await supabaseServerClient
        .from('notifications')
        .insert({
          user_id: notif.userId || null,
          title: notif.title,
          message: notif.message,
          type: notif.type || 'info',
          read: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (fallbackData) {
        return {
          id: String(fallbackData.id),
          userId: fallbackData.user_id,
          role: (notif.role ? notif.role.toUpperCase() : 'ALL') as any,
          title: fallbackData.title,
          message: fallbackData.message,
          type: (fallbackData.type || 'info') as any,
          priority: (notif.priority || 'Medium') as any,
          read: false,
          complaintId: notif.complaintId,
          createdAt: fallbackData.created_at
        };
      }
      return null;
    }

    return {
      id: String(data.id),
      userId: data.user_id,
      role: (data.role ? data.role.toUpperCase() : 'ALL') as any,
      title: data.title,
      message: data.message,
      type: (data.type || 'info') as any,
      priority: (data.priority || 'Medium') as any,
      read: Boolean(data.is_read || data.read),
      complaintId: data.complaint_id,
      createdAt: data.created_at
    };
  } catch (err) {
    console.error('createDbNotification exception:', err);
    return null;
  }
}

export async function markDbNotificationsRead(userId?: string, role?: string): Promise<void> {
  if (!supabaseServerClient) return;
  try {
    if (userId) {
      await supabaseServerClient
        .from('notifications')
        .update({ read: true, is_read: true, updated_at: new Date().toISOString() })
        .or(`user_id.eq.${userId},role.eq.${role || 'ALL'},role.eq.ALL`);
    } else {
      await supabaseServerClient
        .from('notifications')
        .update({ read: true, is_read: true, updated_at: new Date().toISOString() })
        .not('id', 'is', null);
    }
  } catch (err) {
    console.error('markDbNotificationsRead error:', err);
  }
}

export async function markSingleDbNotificationRead(notificationId: string): Promise<void> {
  if (!supabaseServerClient) return;
  try {
    await supabaseServerClient
      .from('notifications')
      .update({ read: true, is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId);
  } catch (err) {
    console.error('markSingleDbNotificationRead error:', err);
  }
}

export async function deleteDbNotification(notificationId: string): Promise<void> {
  if (!supabaseServerClient) return;
  try {
    await supabaseServerClient
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  } catch (err) {
    console.error('deleteDbNotification error:', err);
  }
}
