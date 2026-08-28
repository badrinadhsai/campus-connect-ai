-- ====================================================================
-- CAMPUS CONNECT - SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. PROFILES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT DEFAULT '',
  roll_number TEXT DEFAULT '',
  branch TEXT DEFAULT '',
  year TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
  profile_photo TEXT DEFAULT '',
  disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT 'HelpCircle',
  description TEXT DEFAULT '',
  sla_hours INTEGER DEFAULT 24,
  color TEXT DEFAULT 'indigo',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 3. STAFF ACCOUNTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  department TEXT NOT NULL,
  staff_title TEXT DEFAULT 'Technician',
  disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 4. COMPLAINTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id TEXT UNIQUE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  building TEXT DEFAULT '',
  floor TEXT DEFAULT '',
  room_number TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Submitted',
  assigned_staff UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  upvotes INTEGER DEFAULT 1,
  upvoted_by TEXT[] DEFAULT '{}',
  resolution_remarks TEXT DEFAULT '',
  rejection_reason TEXT DEFAULT '',
  proof_attachment JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 5. ASSIGNMENTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 6. COMMENTS TABLE (and COMPLAINT_COMMENTS)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_avatar TEXT DEFAULT '',
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaint_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_avatar TEXT DEFAULT '',
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 7. ATTACHMENTS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'image/jpeg',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_resolution_proof BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 8. NOTIFICATIONS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 9. AUDIT LOGS TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details TEXT DEFAULT '',
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 10. COMPLAINT HISTORY TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaint_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_status TEXT DEFAULT '',
  new_status TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- AUTOMATIC TIMESTAMPS TRIGGER FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_complaints_updated_at ON public.complaints;
CREATE TRIGGER set_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_assignments_updated_at ON public.assignments;
CREATE TRIGGER set_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_comments_updated_at ON public.comments;
CREATE TRIGGER set_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_attachments_updated_at ON public.attachments;
CREATE TRIGGER set_attachments_updated_at BEFORE UPDATE ON public.attachments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_audit_logs_updated_at ON public.audit_logs;
CREATE TRIGGER set_audit_logs_updated_at BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_complaint_history_updated_at ON public.complaint_history;
CREATE TRIGGER set_complaint_history_updated_at BEFORE UPDATE ON public.complaint_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_staff_accounts_updated_at ON public.staff_accounts;
CREATE TRIGGER set_staff_accounts_updated_at BEFORE UPDATE ON public.staff_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER FOR SUPABASE AUTH REGISTRATION
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    auth_user_id,
    full_name,
    email,
    phone,
    roll_number,
    branch,
    year,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'roll_no', ''),
    COALESCE(NEW.raw_user_meta_data->>'branch', 'CSE'),
    COALESCE(NEW.raw_user_meta_data->>'year', '4th Year'),
    LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'student'))
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    full_name = EXCLUDED.full_name,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_complaints_complaint_id ON public.complaints(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON public.complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_staff ON public.complaints(assigned_staff);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints(category);

CREATE INDEX IF NOT EXISTS idx_assignments_complaint_id ON public.assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_assignments_staff_id ON public.assignments(staff_id);

CREATE INDEX IF NOT EXISTS idx_comments_complaint_id ON public.comments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_attachments_complaint_id ON public.attachments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint_id ON public.complaint_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_profile_id ON public.staff_accounts(profile_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_history ENABLE ROW LEVEL SECURITY;

-- Permissive access policies for production app operation
DROP POLICY IF EXISTS "Profiles policy" ON public.profiles;
CREATE POLICY "Profiles policy" ON public.profiles FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Categories policy" ON public.categories;
CREATE POLICY "Categories policy" ON public.categories FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Staff accounts policy" ON public.staff_accounts;
CREATE POLICY "Staff accounts policy" ON public.staff_accounts FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Complaints RLS policies
DROP POLICY IF EXISTS "Complaints policy" ON public.complaints;
DROP POLICY IF EXISTS "Allow authenticated insert complaints" ON public.complaints;
DROP POLICY IF EXISTS "Allow select complaints" ON public.complaints;
DROP POLICY IF EXISTS "Allow update complaints" ON public.complaints;

CREATE POLICY "Allow authenticated insert complaints" ON public.complaints FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Allow select complaints" ON public.complaints FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Allow update complaints" ON public.complaints FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Assignments policy" ON public.assignments;
CREATE POLICY "Assignments policy" ON public.assignments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Comments policy" ON public.comments;
CREATE POLICY "Comments policy" ON public.comments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Complaint comments policy" ON public.complaint_comments;
CREATE POLICY "Complaint comments policy" ON public.complaint_comments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Attachments policy" ON public.attachments;
CREATE POLICY "Attachments policy" ON public.attachments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Notifications policy" ON public.notifications;
CREATE POLICY "Notifications policy" ON public.notifications FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Audit logs policy" ON public.audit_logs;
CREATE POLICY "Audit logs policy" ON public.audit_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Complaint history policy" ON public.complaint_history;
CREATE POLICY "Complaint history policy" ON public.complaint_history FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- --------------------------------------------------------------------
-- SEED DEFAULT COMPLAINT CATEGORIES
-- --------------------------------------------------------------------
INSERT INTO public.categories (name, icon, description, sla_hours, color) VALUES
  ('Wi-Fi', 'Wifi', 'Wireless connectivity, router outages, signal strength issues', 12, 'emerald'),
  ('Classroom', 'Monitor', 'Projectors, smartboards, desks, podiums, air conditioning', 24, 'indigo'),
  ('Laboratory', 'FlaskConical', 'Lab equipment, chemical safety, electrical outlets, PC hardware', 18, 'purple'),
  ('Library', 'BookOpen', 'Silent zone AC, study desk lights, computer kiosk errors', 24, 'blue'),
  ('Hostel', 'Home', 'Dorm room furniture, window latches, door locks, room AC', 24, 'amber'),
  ('Electricity', 'Zap', 'Power failure, short circuits, broken switches, corridor lights', 6, 'amber'),
  ('Water Leakage', 'Droplets', 'Water leakage, pipe burst, RO purifier failure, tank empty', 6, 'cyan'),
  ('Washroom', 'Bath', 'Sanitation, broken flush, soap dispensers, missing supplies', 8, 'sky'),
  ('Bus', 'Bus', 'Route delays, AC breakdown, seat damage, driver tracking', 12, 'rose'),
  ('Lost & Found', 'Search', 'Lost ID cards, laptops, keys, bottles, bags found on campus', 72, 'teal')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.profiles (full_name, email, phone, roll_number, branch, year, role) VALUES
  ('Alex Chen', 'alex.chen@campus.edu', '9876543210', '211FA04001', 'CSE', '4th Year', 'student'),
  ('Dr. Rajesh Kumar', 'rajesh.kumar@campus.edu', '9876543211', '', 'Electrical Maintenance', '', 'staff'),
  ('Chief Campus Administrator', 'admin@vignan.ac.in', '9876543212', '', 'Administration', '', 'admin')
ON CONFLICT (email) DO NOTHING;
