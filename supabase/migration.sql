-- ═══════════════════════════════════════════════════════════════════
-- Civic Issue Tracker — Database Migration
-- Run this SQL in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── Enums (Safe Re-run) ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('citizen', 'department_admin', 'employee');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_status') THEN
    CREATE TYPE issue_status AS ENUM (
      'REPORTED',
      'DEPARTMENT_ASSIGNED',
      'EMPLOYEE_ASSIGNED',
      'IN_PROGRESS',
      'SUBMITTED_FOR_APPROVAL',
      'APPROVED',
      'REJECTED',
      'CLOSED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'issue_reported',
      'issue_assigned',
      'status_updated',
      'repair_rejected',
      'repair_approved',
      'reward_credited'
    );
  END IF;
END $$;

-- ─── Departments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Seed departments
INSERT INTO departments (name, slug) VALUES
  ('Roads', 'roads'),
  ('Water Supply', 'water'),
  ('Electricity', 'electricity'),
  ('Sanitation', 'sanitation'),
  ('Drainage', 'drainage')
ON CONFLICT (slug) DO NOTHING;

-- ─── Profiles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'citizen',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── Issues ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE RESTRICT NOT NULL,
  assigned_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status issue_status NOT NULL DEFAULT 'REPORTED',
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  location_label TEXT,
  before_image_path TEXT NOT NULL,
  after_image_path TEXT,
  is_genuine BOOLEAN,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── Issue Status Logs (Audit Trail) ─────────────────────────────
CREATE TABLE IF NOT EXISTS issue_status_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  from_status issue_status,
  to_status issue_status NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── Issue Assignments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issue_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  assigned_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── Notifications ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── Rewards ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_department ON issues(department_id);
CREATE INDEX IF NOT EXISTS idx_issues_employee ON issues(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_issues_reporter ON issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issue_logs_issue ON issue_status_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);

-- ═══════════════════════════════════════════════════════════════════
-- Trigger: auto-update updated_at on profiles and issues
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_issues_updated_at ON issues;
CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- Trigger: auto-create profile on sign-up
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role public.user_role := 'citizen'::public.user_role;
  assigned_role text;
BEGIN
  assigned_role := NEW.raw_user_meta_data ->> 'role';
  
  INSERT INTO public.profiles (id, full_name, role, department_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    CASE 
      WHEN assigned_role = 'citizen' THEN 'citizen'::public.user_role
      WHEN assigned_role = 'department_admin' THEN 'department_admin'::public.user_role
      WHEN assigned_role = 'employee' THEN 'employee'::public.user_role
      ELSE default_role 
    END,
    (NEW.raw_user_meta_data ->> 'department_id')::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- SET JWT CLAIMS
  UPDATE auth.users 
  SET raw_app_meta_data = 
    raw_app_meta_data || 
    json_build_object(
      'role', CASE 
                WHEN assigned_role = 'citizen' THEN 'citizen'
                WHEN assigned_role = 'department_admin' THEN 'department_admin'
                WHEN assigned_role = 'employee' THEN 'employee'
                ELSE 'citizen'
              END,
      'department_id', NEW.raw_user_meta_data ->> 'department_id'
    )::jsonb
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- Helper Functions for Safe Role/Department Checks (Avoids RLS Recursion)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS public.user_role AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
    'citizen'
  )::public.user_role;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_auth_department()
RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'department_id')::UUID;
$$ LANGUAGE sql STABLE;

-- ═══════════════════════════════════════════════════════════════════
-- Row-Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Departments: readable by everyone (including unauthenticated, needed for signup)
DROP POLICY IF EXISTS "Departments are viewable by all authenticated users" ON departments;
DROP POLICY IF EXISTS "Departments are viewable by anyone" ON departments;
CREATE POLICY "Departments are viewable by anyone"
  ON departments FOR SELECT TO anon, authenticated
  USING (true);


-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Allow department admins to view employees in their department
DROP POLICY IF EXISTS "Dept admins can view department members" ON profiles;
CREATE POLICY "Dept admins can view department members"
  ON profiles FOR SELECT TO authenticated
  USING (
    department_id = public.get_auth_department() 
    AND public.get_auth_role() = 'department_admin'
  );

-- Issues: citizens see own issues
DROP POLICY IF EXISTS "Citizens can view own issues" ON issues;
CREATE POLICY "Citizens can view own issues"
  ON issues FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

-- Issues: dept admins see department issues
DROP POLICY IF EXISTS "Dept admins can view department issues" ON issues;
CREATE POLICY "Dept admins can view department issues"
  ON issues FOR SELECT TO authenticated
  USING (
    department_id = public.get_auth_department()
    AND public.get_auth_role() = 'department_admin'
  );

-- Issues: employees see assigned issues
DROP POLICY IF EXISTS "Employees can view assigned issues" ON issues;
CREATE POLICY "Employees can view assigned issues"
  ON issues FOR SELECT TO authenticated
  USING (assigned_employee_id = auth.uid());

-- Issues: authenticated users can create issues
DROP POLICY IF EXISTS "Citizens can create issues" ON issues;
DROP POLICY IF EXISTS "Authenticated users can create issues" ON issues;
CREATE POLICY "Authenticated users can create issues"
  ON issues FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Issues: dept admins can update (assign, review)
DROP POLICY IF EXISTS "Dept admins can update department issues" ON issues;
CREATE POLICY "Dept admins can update department issues"
  ON issues FOR UPDATE TO authenticated
  USING (
    department_id = public.get_auth_department()
    AND public.get_auth_role() = 'department_admin'
  );

-- Issues: employees can update assigned issues
DROP POLICY IF EXISTS "Employees can update assigned issues" ON issues;
CREATE POLICY "Employees can update assigned issues"
  ON issues FOR UPDATE TO authenticated
  USING (
    assigned_employee_id = auth.uid()
    AND public.get_auth_role() = 'employee'
  );

-- Issue Status Logs: viewable if user can see the parent issue
DROP POLICY IF EXISTS "Users can view logs for visible issues" ON issue_status_logs;
CREATE POLICY "Users can view logs for visible issues"
  ON issue_status_logs FOR SELECT TO authenticated
  USING (
    issue_id IN (SELECT id FROM issues)
  );

-- Issue Status Logs: authenticated users can insert
DROP POLICY IF EXISTS "Authenticated users can create status logs" ON issue_status_logs;
CREATE POLICY "Authenticated users can create status logs"
  ON issue_status_logs FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Issue Assignments: viewable if user can see the parent issue
DROP POLICY IF EXISTS "Users can view assignments for visible issues" ON issue_assignments;
CREATE POLICY "Users can view assignments for visible issues"
  ON issue_assignments FOR SELECT TO authenticated
  USING (
    issue_id IN (SELECT id FROM issues)
  );

-- Issue Assignments: dept admins can insert
DROP POLICY IF EXISTS "Dept admins can create assignments" ON issue_assignments;
CREATE POLICY "Dept admins can create assignments"
  ON issue_assignments FOR INSERT TO authenticated
  WITH CHECK (
    assigned_by = auth.uid()
    AND public.get_auth_role() = 'department_admin'
  );

-- Notifications: users see own
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Notifications: can insert (system creates them)
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Notifications: users can update own (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Rewards: users see own
DROP POLICY IF EXISTS "Users can view own rewards" ON rewards;
CREATE POLICY "Users can view own rewards"
  ON rewards FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Rewards: can insert (system creates them)
DROP POLICY IF EXISTS "System can create rewards" ON rewards;
CREATE POLICY "System can create rewards"
  ON rewards FOR INSERT TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- Storage: issue-images bucket
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-images', 'issue-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images ONLY to their own folder
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'issue-images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to issue images
DROP POLICY IF EXISTS "Public can view issue images" ON storage.objects;
CREATE POLICY "Public can view issue images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'issue-images');

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
CREATE POLICY "Users can update own uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'issue-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'issue-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════════
-- Realtime: Enable realtime for issues and notifications
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'issues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE issues;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
