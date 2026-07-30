import { IssueStatus, STATUS_LABELS } from '@/lib/types/database';

interface StatusBadgeProps {
  status: IssueStatus;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_UI: Record<IssueStatus, { label: string; bg: string; color: string; dot: string }> = {
  REPORTED: { label: "Reported", bg: "#1e3a5f", color: "#60a5fa", dot: "#3b82f6" },
  IN_PROGRESS: { label: "In Progress", bg: "#1a3a2a", color: "#34d399", dot: "#10b981" },
  APPROVED: { label: "Approved", bg: "#3a2a1a", color: "#FF2E11", dot: "#FF2E11" },
  DEPARTMENT_ASSIGNED: { label: "Assigned", bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  EMPLOYEE_ASSIGNED: { label: "Emp. Assigned", bg: "#1a2e3a", color: "#67e8f9", dot: "#06b6d4" },
  SUBMITTED_FOR_APPROVAL: { label: "Pending", bg: "#3a2a0a", color: "#fbbf24", dot: "#f59e0b" },
  REJECTED: { label: "Rejected", bg: "#3a1a1a", color: "#f87171", dot: "#ef4444" },
  CLOSED: { label: "Closed", bg: "#1f1f1f", color: "#9ca3af", dot: "#6b7280" },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cfg = STATUS_UI[status] || STATUS_UI.REPORTED;
  const padding = size === 'lg' ? '6px 14px' : size === 'md' ? '4px 12px' : '4px 10px';
  const fontSize = size === 'lg' ? '11px' : size === 'md' ? '10px' : '10px';

  return (
    <span
      className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider whitespace-nowrap border"
      style={{
        background: `${cfg.bg}88`,
        color: cfg.color,
        padding: padding,
        borderRadius: '99px',
        fontSize: fontSize,
        borderColor: `${cfg.dot}30`,
        backdropFilter: 'blur(4px)',
      }}
    >
      <span 
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-fast" 
        style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} 
      />
      {cfg.label}
    </span>
  );
}
