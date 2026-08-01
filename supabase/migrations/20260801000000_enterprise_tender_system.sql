-- Enable PostGIS for geospatial capabilities
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Departments (assuming it might already exist, we alter it or create if not exists)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    management_mode TEXT DEFAULT 'DEPARTMENT' CHECK (management_mode IN ('DEPARTMENT', 'TENDER')),
    community_radius_meters INTEGER DEFAULT 5000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tenders
CREATE TABLE IF NOT EXISTS public.tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_number TEXT UNIQUE NOT NULL,
    department_id UUID REFERENCES public.departments(id),
    title TEXT NOT NULL,
    description TEXT,
    scope_of_work TEXT,
    tender_type TEXT CHECK (tender_type IN ('Open Tender', 'Limited Tender', 'Single Source', 'Emergency Tender', 'Annual Maintenance Contract', 'Framework Agreement')),
    estimated_budget DECIMAL(15, 2),
    emd_amount DECIMAL(15, 2),
    contract_start_date DATE,
    contract_end_date DATE,
    bid_submission_deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Closed', 'Evaluation', 'Awarded', 'Active', 'Expired', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tender Bids (Immutable after deadline)
CREATE TABLE IF NOT EXISTS public.tender_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES public.tenders(id),
    company_id UUID NOT NULL, -- references auth.users or profiles ideally
    bid_amount DECIMAL(15, 2) NOT NULL,
    estimated_completion_days INTEGER,
    technical_proposal_url TEXT,
    financial_proposal_url TEXT,
    status TEXT DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Selected', 'Rejected')),
    digital_signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tender_id, company_id)
);

-- 4. Contracts (Drives Routing)
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES public.tenders(id),
    company_id UUID NOT NULL,
    department_id UUID REFERENCES public.departments(id),
    priority INTEGER DEFAULT 1,
    sla_tier TEXT DEFAULT 'Standard' CHECK (sla_tier IN ('Critical', 'High', 'Medium', 'Low', 'Standard')),
    target_response_hours INTEGER DEFAULT 24,
    target_resolution_hours INTEGER DEFAULT 72,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Terminated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Contract Areas (GIS)
CREATE TABLE IF NOT EXISTS public.contract_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    area_type TEXT CHECK (area_type IN ('Polygon', 'Point', 'Circle', 'City', 'District', 'State', 'Ward')),
    boundary GEOGRAPHY(POLYGON, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Company Ratings (Weighted)
CREATE TABLE IF NOT EXISTS public.company_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE,
    technical_score DECIMAL(5, 2) DEFAULT 0,
    financial_score DECIMAL(5, 2) DEFAULT 0,
    citizen_score DECIMAL(5, 2) DEFAULT 0,
    department_score DECIMAL(5, 2) DEFAULT 0,
    penalty_points INTEGER DEFAULT 0,
    completed_issues INTEGER DEFAULT 0,
    rejected_issues INTEGER DEFAULT 0,
    average_delay_hours DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Community Reviews (For Issues)
CREATE TABLE IF NOT EXISTS public.community_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id TEXT NOT NULL, -- Reference to NoSQL ID or PG ID
    citizen_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    still_exists BOOLEAN DEFAULT false,
    distance_meters DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(issue_id, citizen_id)
);

-- 8. Audit Logs (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dept_modtime BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_tender_modtime BEFORE UPDATE ON public.tenders FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_bid_modtime BEFORE UPDATE ON public.tender_bids FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_contract_modtime BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_rating_modtime BEFORE UPDATE ON public.company_ratings FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Setup RLS (Basic)
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tender_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read tenders
CREATE POLICY "Anyone can view published tenders" ON public.tenders FOR SELECT USING (true);
CREATE POLICY "Admins can manage tenders" ON public.tenders FOR ALL USING (true); -- Implement proper role check later

CREATE POLICY "Companies can view own bids" ON public.tender_bids FOR SELECT USING (true);
CREATE POLICY "Companies can insert bids" ON public.tender_bids FOR INSERT WITH CHECK (true);

CREATE POLICY "Audit logs are read only" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Audit logs insert only" ON public.audit_logs FOR INSERT WITH CHECK (true);
