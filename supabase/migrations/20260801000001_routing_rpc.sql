-- Create RPC function to find active contract for a given location
CREATE OR REPLACE FUNCTION find_active_contract(
    p_department_slug TEXT,
    p_lng DOUBLE PRECISION,
    p_lat DOUBLE PRECISION
)
RETURNS TABLE (
    contract_id UUID,
    company_id UUID,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id, 
        c.company_id,
        c.priority
    FROM public.contracts c
    JOIN public.contract_areas ca ON c.id = ca.contract_id
    JOIN public.departments d ON c.department_id = d.id
    WHERE d.slug = p_department_slug
      AND c.status = 'Active'
      AND ST_Intersects(ca.boundary, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
    ORDER BY c.priority DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
