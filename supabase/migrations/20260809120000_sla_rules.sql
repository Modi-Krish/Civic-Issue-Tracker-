-- 1. Create SLA Rules Table
CREATE TABLE IF NOT EXISTS public.sla_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority TEXT UNIQUE NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    target_resolution_hours INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
CREATE POLICY "Allow public read access to SLA rules" ON public.sla_rules
    FOR SELECT USING (true);

-- 4. Seed default SLA timelines
INSERT INTO public.sla_rules (priority, target_resolution_hours) VALUES
('CRITICAL', 4),
('HIGH', 24),
('MEDIUM', 72),
('LOW', 168)
ON CONFLICT (priority) DO UPDATE SET target_resolution_hours = EXCLUDED.target_resolution_hours;
