/**
 * Client-side issue actions for Capacitor build.
 * Replaces server-side issue.ts — uses browser Supabase client.
 */
import { createClient } from '@/lib/supabase/client';

export async function submitIssue(formData: FormData) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const issueType = formData.get('issueType') as string;
  const deptSlug = formData.get('deptSlug') as string;
  const locationLat = parseFloat(formData.get('locationLat') as string);
  const locationLng = parseFloat(formData.get('locationLng') as string);
  const locationLabel = formData.get('locationLabel') as string;
  const filePath = formData.get('filePath') as string;

  // 1. Department Detection
  const { data: dept } = await supabase
    .from('departments')
    .select('id')
    .eq('slug', deptSlug)
    .single();

  if (!dept) return { error: 'Department not found' };

  // 2. Area Detection via PostGIS
  const { data: areaId, error: areaError } = await supabase
    .rpc('get_area_by_location', { lat: locationLat, lng: locationLng });

  let assignedCompanyId = null;
  let status = 'REPORTED';

  if (areaId) {
    status = 'AREA_IDENTIFIED';

    // 3. Check Active Contract
    const { data: contract } = await supabase
      .from('contracts')
      .select('company_id')
      .eq('area_id', areaId)
      .eq('department_id', dept.id)
      .eq('status', 'ACTIVE')
      .single();

    if (contract) {
      assignedCompanyId = contract.company_id;
      status = 'COMPANY_ASSIGNED';
    }
  }

  // 4. Create Issue
  const { data: issue, error: insertError } = await supabase
    .from('issues')
    .insert({
      reporter_id: user.id,
      department_id: dept.id,
      area_id: areaId || null,
      company_id: assignedCompanyId,
      issue_type: issueType,
      title,
      description,
      status,
      location_lat: locationLat,
      location_lng: locationLng,
      location_label: locationLabel || null,
      before_image_path: filePath,
    })
    .select('id')
    .single();

  if (insertError) return { error: insertError.message };

  // Log status change
  await supabase.from('issue_status_logs').insert({
    issue_id: issue.id,
    to_status: status,
    changed_by: user.id,
    comment: 'Auto-routed via GIS engine'
  });

  return { success: true, issueId: issue.id };
}
