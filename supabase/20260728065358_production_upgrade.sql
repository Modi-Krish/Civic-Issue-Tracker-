-- ═══════════════════════════════════════════════════════════════════
-- Smart City Governance Platform Upgrade Migration
-- Run this AFTER migration.sql in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Enable PostGIS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── 2. Update Enums ────────────────────────────────────────────────
-- Add new roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'government_officer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'company_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'company_employee';

-- Add new issue statuses
ALTER TYPE issue_status ADD VALUE IF NOT EXISTS 'AREA_IDENTIFIED';
ALTER TYPE issue_status ADD VALUE IF NOT EXISTS 'DEPARTMENT_IDENTIFIED';
ALTER TYPE issue_status ADD VALUE IF NOT EXISTS 'CONTRACT_FOUND';
ALTER TYPE issue_status ADD VALUE IF NOT EXISTS 'COMPANY_ASSIGNED';
ALTER TYPE issue_status ADD VALUE IF NOT EXISTS 'COMPANY_EMPLOYEE_ASSIGNED';
ALTER TYPE issue_status ADD VALUE IF NOT EXISTS 'WORK_COMPLETED';
ALTER TYPE issue_status ADD VALUE IF NOT EXISTS 'GOVERNMENT_REVIEW';
ALTER TYPE issue_status ADD VALUE IF NOT EXISTS 'CITIZEN_FEEDBACK';

-- ─── 3. New Tables ──────────────────────────────────────────────────

-- Areas (PostGIS)
CREATE TABLE IF NOT EXISTS areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ward_number TEXT,
  zone TEXT,
  city TEXT,
  state TEXT,
  boundary geometry(MultiPolygon, 4326),
  center geometry(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_areas_boundary ON areas USING GIST (boundary);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  license_number TEXT NOT NULL UNIQUE,
  gst_number TEXT NOT NULL UNIQUE,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 0.00,
  completed_projects INTEGER DEFAULT 0,
  active_contracts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tenders
DO $$ BEGIN
  CREATE TYPE tender_status AS ENUM ('OPEN', 'CLOSED', 'AWARDED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS tenders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID REFERENCES departments(id) ON DELETE RESTRICT NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE RESTRICT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_budget NUMERIC(15, 2) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status tender_status DEFAULT 'OPEN' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tender Bids
DO $$ BEGIN
  CREATE TYPE bid_status AS ENUM ('PENDING', 'SELECTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS tender_bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  quoted_price NUMERIC(15, 2) NOT NULL,
  completion_days INTEGER NOT NULL,
  proposal_document TEXT,
  status bid_status DEFAULT 'PENDING' NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(tender_id, company_id)
);

-- Contracts
DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('ACTIVE', 'EXPIRED', 'TERMINATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE RESTRICT NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE RESTRICT NOT NULL,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  contract_amount NUMERIC(15, 2) NOT NULL,
  contract_start TIMESTAMPTZ NOT NULL,
  contract_end TIMESTAMPTZ NOT NULL,
  status contract_status DEFAULT 'ACTIVE' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Company Employees
DO $$ BEGIN
  CREATE TYPE company_employee_availability AS ENUM ('ACTIVE', 'ON_LEAVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS company_employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_area UUID REFERENCES areas(id) ON DELETE SET NULL,
  designation TEXT,
  availability company_employee_availability DEFAULT 'ACTIVE',
  UNIQUE(profile_id)
);

-- Company Reviews
CREATE TABLE IF NOT EXISTS company_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  citizen_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  distance NUMERIC(10, 2), -- Distance in meters
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(issue_id, citizen_id)
);

-- Device Tokens (Firebase)
DO $$ BEGIN
  CREATE TYPE device_platform AS ENUM ('ANDROID', 'WEB', 'IOS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  device_token TEXT NOT NULL UNIQUE,
  platform device_platform NOT NULL,
  device_name TEXT,
  app_version TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_used TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── 4. Alter Existing Tables ───────────────────────────────────────
ALTER TABLE issues 
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_issues_area ON issues(area_id);
CREATE INDEX IF NOT EXISTS idx_issues_company ON issues(company_id);

-- ─── 5. Row Level Security (RLS) Additions ──────────────────────────
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Areas: Public read
DROP POLICY IF EXISTS "Areas are readable by all" ON areas;
CREATE POLICY "Areas are readable by all" ON areas FOR SELECT USING (true);

-- Companies: Public read, admin edit
DROP POLICY IF EXISTS "Companies readable by all" ON companies;
CREATE POLICY "Companies readable by all" ON companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Company Admins can update own company" ON companies;
CREATE POLICY "Company Admins can update own company" ON companies FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM company_employees ce WHERE ce.company_id = companies.id AND ce.profile_id = auth.uid() AND (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'company_admin')
);

-- Tenders: Public read
DROP POLICY IF EXISTS "Tenders are readable by all" ON tenders;
CREATE POLICY "Tenders are readable by all" ON tenders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gov Officers can manage tenders" ON tenders;
CREATE POLICY "Gov Officers can manage tenders" ON tenders FOR ALL TO authenticated USING (
  (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('government_officer', 'super_admin')
);

-- Tender Bids: Company can view their own, Gov can view all
DROP POLICY IF EXISTS "Gov Officers view all bids" ON tender_bids;
CREATE POLICY "Gov Officers view all bids" ON tender_bids FOR SELECT TO authenticated USING (
  (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('government_officer', 'super_admin')
);
DROP POLICY IF EXISTS "Companies view own bids" ON tender_bids;
CREATE POLICY "Companies view own bids" ON tender_bids FOR SELECT TO authenticated USING (
  company_id IN (SELECT company_id FROM company_employees WHERE profile_id = auth.uid())
);
DROP POLICY IF EXISTS "Companies insert own bids" ON tender_bids;
CREATE POLICY "Companies insert own bids" ON tender_bids FOR INSERT TO authenticated WITH CHECK (
  company_id IN (SELECT company_id FROM company_employees WHERE profile_id = auth.uid() AND (SELECT role::text FROM profiles WHERE id = auth.uid()) = 'company_admin')
);

-- Contracts: Public read (or restrict to gov/company)
DROP POLICY IF EXISTS "Contracts readable by all" ON contracts;
CREATE POLICY "Contracts readable by all" ON contracts FOR SELECT USING (true);

-- Company Employees: Employee views own, Company Admin views all for company
DROP POLICY IF EXISTS "Company employees viewable by company members" ON company_employees;
CREATE POLICY "Company employees viewable by company members" ON company_employees FOR SELECT TO authenticated USING (
  company_id IN (SELECT company_id FROM company_employees WHERE profile_id = auth.uid())
  OR (SELECT role::text FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'government_officer')
);

-- Company Reviews: Public read, citizens can insert for themselves
DROP POLICY IF EXISTS "Company reviews readable by all" ON company_reviews;
CREATE POLICY "Company reviews readable by all" ON company_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Citizens can insert own review" ON company_reviews;
CREATE POLICY "Citizens can insert own review" ON company_reviews FOR INSERT TO authenticated WITH CHECK (
  citizen_id = auth.uid()
);

-- Device Tokens: Users manage their own
DROP POLICY IF EXISTS "Users manage own device tokens" ON device_tokens;
CREATE POLICY "Users manage own device tokens" ON device_tokens FOR ALL TO authenticated USING (
  user_id = auth.uid()
) WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_areas_updated_at ON areas;
CREATE TRIGGER trg_areas_updated_at BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_device_tokens_updated_at ON device_tokens;
CREATE TRIGGER trg_device_tokens_updated_at BEFORE UPDATE ON device_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 5.5 Trigger Override ────────────────────────────────────────────────
-- Update handle_new_user to support all the new roles
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
      WHEN assigned_role = 'government_officer' THEN 'government_officer'::public.user_role
      WHEN assigned_role = 'company_admin' THEN 'company_admin'::public.user_role
      WHEN assigned_role = 'company_employee' THEN 'company_employee'::public.user_role
      WHEN assigned_role = 'super_admin' THEN 'super_admin'::public.user_role
      ELSE default_role 
    END,
    (NEW.raw_user_meta_data ->> 'department_id')::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 6. PostGIS RPC Functions ─────────────────────────────────────────

-- RPC: Find the Area ID containing a specific Lat/Lng point
CREATE OR REPLACE FUNCTION public.get_area_by_location(lat double precision, lng double precision)
RETURNS UUID AS $$
DECLARE
  found_area_id UUID;
BEGIN
  -- ST_SetSRID(ST_MakePoint(lng, lat), 4326) creates the point
  SELECT id INTO found_area_id
  FROM areas
  WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  LIMIT 1;

  RETURN found_area_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, postgis;

-- RPC: Check if citizen is within 5km of an issue for rating
CREATE OR REPLACE FUNCTION public.can_citizen_rate_company(
  p_citizen_id UUID,
  p_issue_id UUID,
  p_citizen_lat double precision,
  p_citizen_lng double precision
)
RETURNS BOOLEAN AS $$
DECLARE
  issue_geom geometry;
  citizen_geom geometry;
  is_within BOOLEAN;
BEGIN
  -- Get issue coordinates
  SELECT ST_SetSRID(ST_MakePoint(location_lng, location_lat), 4326) INTO issue_geom
  FROM issues WHERE id = p_issue_id AND status = 'CLOSED';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  citizen_geom := ST_SetSRID(ST_MakePoint(p_citizen_lng, p_citizen_lat), 4326);

  -- ST_DWithin using geography for meters (5000m = 5km)
  SELECT ST_DWithin(issue_geom::geography, citizen_geom::geography, 5000) INTO is_within;

  RETURN is_within;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, postgis;

-- ─── 7. PostGIS Security Fix ──────────────────────────────────────────
-- Note: The Supabase dashboard might show a security warning for spatial_ref_sys
-- not having RLS enabled. This is a known issue. You cannot enable RLS on it
-- because the table is owned by a system user. It is safe to ignore that warning.
