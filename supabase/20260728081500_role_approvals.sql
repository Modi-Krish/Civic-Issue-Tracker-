-- ═══════════════════════════════════════════════════════════════════
-- Role Approvals Pipeline Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add account_status column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'account_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN account_status TEXT NOT NULL DEFAULT 'APPROVED';
  END IF;
END $$;

-- 2. Update the handle_new_user trigger to set PENDING for specific roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role public.user_role := 'citizen'::public.user_role;
  assigned_role text;
  assigned_status text := 'APPROVED';
BEGIN
  assigned_role := NEW.raw_user_meta_data ->> 'role';
  
  -- Require approval for field employees and department admins
  IF assigned_role IN ('employee', 'department_admin') THEN
    assigned_status := 'PENDING';
  END IF;
  
  INSERT INTO public.profiles (id, full_name, role, department_id, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
    CASE 
      WHEN assigned_role = 'citizen' THEN 'citizen'::public.user_role
      WHEN assigned_role = 'department_admin' THEN 'department_admin'::public.user_role
      WHEN assigned_role = 'employee' THEN 'employee'::public.user_role
      WHEN assigned_role = 'government_officer' THEN 'government_officer'::public.user_role
      WHEN assigned_role = 'company_admin' THEN 'company_admin'::public.user_role
      WHEN assigned_role = 'company_employee' THEN 'company_employee'::public.user_role
      WHEN assigned_role = 'super_admin' THEN 'super_admin'::public.user_role
      ELSE default_role 
    END,
    (NEW.raw_user_meta_data ->> 'department_id')::UUID,
    assigned_status
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
