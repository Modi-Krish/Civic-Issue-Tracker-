// ─── Enums ───────────────────────────────────────────────────────────
export type UserRole = 'citizen' | 'government_officer' | 'company_admin' | 'company_employee' | 'department_admin' | 'employee' | 'super_admin';

export type IssueStatus =
  | 'REPORTED'
  | 'DEPARTMENT_ASSIGNED'
  | 'COMPANY_ASSIGNED'
  | 'COMPANY_EMPLOYEE_ASSIGNED'
  | 'EMPLOYEE_ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED_FOR_APPROVAL'
  | 'COMMUNITY_REVIEW'
  | 'COMMUNITY_REJECTED'
  | 'VERIFIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export type NotificationType =
  | 'issue_reported'
  | 'issue_assigned'
  | 'status_updated'
  | 'repair_rejected'
  | 'repair_approved'
  | 'reward_credited';

// ─── Table Row Types ─────────────────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  management_mode?: 'DEPARTMENT' | 'TENDER';
  community_radius_meters?: number;
  created_at: string;
  updated_at?: string;
}

export interface Issue {
  id: string;
  reporter_id: string;
  department_id: string;
  company_id?: string | null;
  assigned_employee_id: string | null;
  issue_type: string;
  title: string;
  description: string;
  status: IssueStatus;
  location_lat: number;
  location_lng: number;
  location_label: string | null;
  before_image_path: string;
  after_image_path: string | null;
  is_genuine: boolean | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueStatusLog {
  id: string;
  issue_id: string;
  from_status: IssueStatus | null;
  to_status: IssueStatus;
  changed_by: string;
  comment: string | null;
  created_at: string;
}

export interface IssueAssignment {
  id: string;
  issue_id: string;
  assigned_employee_id: string;
  assigned_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  issue_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface Reward {
  id: string;
  user_id: string;
  issue_id: string;
  points: number;
  reason: string;
  created_at: string;
}

// ─── Valid Status Transitions ────────────────────────────────────────
export const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  REPORTED: ['DEPARTMENT_ASSIGNED', 'COMPANY_ASSIGNED'],
  DEPARTMENT_ASSIGNED: ['EMPLOYEE_ASSIGNED', 'COMPANY_ASSIGNED'],
  COMPANY_ASSIGNED: ['COMPANY_EMPLOYEE_ASSIGNED'],
  COMPANY_EMPLOYEE_ASSIGNED: ['IN_PROGRESS', 'SUBMITTED_FOR_APPROVAL'],
  EMPLOYEE_ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED_FOR_APPROVAL'],
  SUBMITTED_FOR_APPROVAL: ['APPROVED', 'REJECTED', 'COMMUNITY_REVIEW'],
  COMMUNITY_REVIEW: ['VERIFIED', 'COMMUNITY_REJECTED', 'CLOSED', 'COMPANY_ASSIGNED'],
  COMMUNITY_REJECTED: ['EMPLOYEE_ASSIGNED', 'COMPANY_ASSIGNED'],
  VERIFIED: ['CLOSED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['EMPLOYEE_ASSIGNED', 'COMPANY_ASSIGNED', 'COMPANY_EMPLOYEE_ASSIGNED'],
  CLOSED: [],
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  REPORTED: 'Reported',
  DEPARTMENT_ASSIGNED: 'Dept. Assigned',
  COMPANY_ASSIGNED: 'Company Assigned',
  COMPANY_EMPLOYEE_ASSIGNED: 'Corporate Employee Assigned',
  EMPLOYEE_ASSIGNED: 'Employee Assigned',
  IN_PROGRESS: 'In Progress',
  SUBMITTED_FOR_APPROVAL: 'Submitted for Approval',
  COMMUNITY_REVIEW: 'Community Review',
  COMMUNITY_REJECTED: 'Community Rejected',
  VERIFIED: 'Verified',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

// ─── Issue Types ─────────────────────────────────────────────────────
export const ISSUE_TYPES = [
  'Road Damage',
  'Water Leakage',
  'Electricity Fault',
  'Sanitation',
  'Streetlight',
  'Drainage',
  'Other',
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

// ─── Department Mapping ──────────────────────────────────────────────
export const ISSUE_TYPE_TO_DEPARTMENT: Record<IssueType, string> = {
  'Road Damage': 'roads',
  'Water Leakage': 'water',
  'Electricity Fault': 'electricity',
  Sanitation: 'sanitation',
  Streetlight: 'electricity',
  Drainage: 'drainage',
  Other: 'sanitation',
};

// ─── Enterprise Tender System Interfaces ─────────────────────────────

export interface Tender {
  id: string;
  tender_number: string;
  department_id: string;
  title: string;
  description: string;
  scope_of_work: string;
  tender_type: 'Open Tender' | 'Limited Tender' | 'Single Source' | 'Emergency Tender' | 'Annual Maintenance Contract' | 'Framework Agreement';
  estimated_budget: number;
  emd_amount: number;
  contract_start_date: string;
  contract_end_date: string;
  bid_submission_deadline: string;
  status: 'Draft' | 'Published' | 'Closed' | 'Evaluation' | 'Awarded' | 'Active' | 'Expired' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

export interface TenderBid {
  id: string;
  tender_id: string;
  company_id: string;
  bid_amount: number;
  estimated_completion_days: number;
  technical_proposal_url: string;
  financial_proposal_url: string;
  status: 'Submitted' | 'Selected' | 'Rejected';
  digital_signature: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  tender_id: string;
  company_id: string;
  department_id: string;
  priority: number;
  sla_tier: 'Critical' | 'High' | 'Medium' | 'Low' | 'Standard';
  target_response_hours: number;
  target_resolution_hours: number;
  start_date: string;
  end_date: string;
  status: 'Active' | 'Expired' | 'Terminated';
  created_at: string;
  updated_at: string;
}

export interface ContractArea {
  id: string;
  contract_id: string;
  area_type: 'Polygon' | 'Point' | 'Circle' | 'City' | 'District' | 'State' | 'Ward';
  boundary: unknown; // GeoJSON or PostGIS format
  created_at: string;
}

export interface CompanyRating {
  id: string;
  company_id: string;
  technical_score: number;
  financial_score: number;
  citizen_score: number;
  department_score: number;
  penalty_points: number;
  completed_issues: number;
  rejected_issues: number;
  average_delay_hours: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityReview {
  id: string;
  issue_id: string;
  citizen_id: string;
  rating: number;
  comment: string;
  still_exists: boolean;
  distance_meters: number;
  created_at: string;
}

export interface CompanyEmployee {
  id: string;
  company_id: string;
  profile_id: string;
  assigned_area?: string | null;
  designation?: string | null;
  availability?: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  email?: string;
  phone?: string;
  full_name?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  previous_state: unknown;
  new_state: unknown;
  created_at: string;
}


