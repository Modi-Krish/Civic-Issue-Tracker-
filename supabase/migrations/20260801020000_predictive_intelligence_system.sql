-- Enable PostGIS extension for spatial queries if not present
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Recurring Patterns Table
CREATE TABLE IF NOT EXISTS public.recurring_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL,
  department_id TEXT,
  company_id UUID,                     -- Assigned Contractor under Tender
  contract_id UUID,                    -- Active Contract
  cluster_lat DOUBLE PRECISION NOT NULL,
  cluster_lng DOUBLE PRECISION NOT NULL,
  location_description TEXT NOT NULL,
  occurrence_count INT NOT NULL DEFAULT 0,
  merged_event_count INT NOT NULL DEFAULT 0, -- Unique events after 24h deduplication
  median_interval_days DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  avg_interval_days DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  last_occurrence_at TIMESTAMPTZ NOT NULL,
  predicted_next_at TIMESTAMPTZ NOT NULL,
  prediction_confidence INT NOT NULL DEFAULT 0, -- 0-100%
  risk_score INT NOT NULL DEFAULT 0,            -- 0-100
  severity_level TEXT NOT NULL CHECK (severity_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  trend TEXT NOT NULL CHECK (trend IN ('INCREASING', 'STABLE', 'DECREASING')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNDER_INVESTIGATION', 'REPAIR_SCHEDULED', 'INFRASTRUCTURE_UPGRADE', 'RESOLVED', 'IGNORED')),
  recommendation_text TEXT,             -- Automated Rule Engine Output
  repeat_failure_rate DOUBLE PRECISION DEFAULT 0.0, -- Contractor Repeat Failure %
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Pattern to Issue Junction Table
CREATE TABLE IF NOT EXISTS public.pattern_issue_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.recurring_patterns(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Recurring Alerts Table
CREATE TABLE IF NOT EXISTS public.recurring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.recurring_patterns(id) ON DELETE CASCADE,
  company_id UUID,
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  message TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('NEW_PATTERN', 'WORSENING_TREND', 'UPCOMING_FAILURE', 'CONTRACTOR_REPEAT_FAILURE')),
  status TEXT NOT NULL DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Incremental Analysis Metadata Table
CREATE TABLE IF NOT EXISTS public.analytics_metadata (
  key TEXT PRIMARY KEY,
  last_analyzed_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
