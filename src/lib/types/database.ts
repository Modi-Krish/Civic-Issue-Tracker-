// ─── Enums ───────────────────────────────────────────────────────────
export type UserRole = 'citizen' | 'government_officer' | 'company_admin' | 'company_employee' | 'department_admin' | 'employee' | 'super_admin';

export type IssueStatus =
  | 'REPORTED'
  | 'DEPARTMENT_ASSIGNED'
  | 'EMPLOYEE_ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED_FOR_APPROVAL'
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
  created_at: string;
}

export interface Issue {
  id: string;
  reporter_id: string;
  department_id: string;
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
  REPORTED: ['DEPARTMENT_ASSIGNED'],
  DEPARTMENT_ASSIGNED: ['EMPLOYEE_ASSIGNED'],
  EMPLOYEE_ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED_FOR_APPROVAL'],
  SUBMITTED_FOR_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['EMPLOYEE_ASSIGNED'],
  CLOSED: [],
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  REPORTED: 'Reported',
  DEPARTMENT_ASSIGNED: 'Dept. Assigned',
  EMPLOYEE_ASSIGNED: 'Employee Assigned',
  IN_PROGRESS: 'In Progress',
  SUBMITTED_FOR_APPROVAL: 'Submitted for Approval',
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
