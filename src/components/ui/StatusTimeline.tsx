import { IssueStatus, STATUS_LABELS } from '@/lib/types/database';

interface StatusTimelineProps {
  currentStatus: IssueStatus;
  logs?: { to_status: IssueStatus; created_at: string }[];
}

const TIMELINE_STEPS: IssueStatus[] = [
  'REPORTED',
  'DEPARTMENT_ASSIGNED',
  'EMPLOYEE_ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED_FOR_APPROVAL',
  'APPROVED',
  'CLOSED',
];

const SHORT_LABELS: Record<IssueStatus, string> = {
  REPORTED: 'Reported',
  DEPARTMENT_ASSIGNED: 'Dept.',
  COMPANY_ASSIGNED: 'Company',
  COMPANY_EMPLOYEE_ASSIGNED: 'Emp. Assigned',
  EMPLOYEE_ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  SUBMITTED_FOR_APPROVAL: 'Submitted',
  COMMUNITY_REVIEW: 'Comm. Review',
  VERIFIED: 'Verified',
  COMMUNITY_REJECTED: 'Comm. Rejected',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};


export default function StatusTimeline({ currentStatus, logs = [] }: StatusTimelineProps) {
  let currentIdx = TIMELINE_STEPS.indexOf(currentStatus);
  const isRejected = currentStatus === 'REJECTED';
  
  // If rejected, show progress as back at the "Employee Assigned" stage
  // so the timeline doesn't look completely empty or "closed"
  if (isRejected) {
    currentIdx = TIMELINE_STEPS.indexOf('EMPLOYEE_ASSIGNED');
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center min-w-[500px] px-2 py-4">
        {TIMELINE_STEPS.map((step, idx) => {
          const isCompleted = idx <= currentIdx;
          const isCurrent = step === currentStatus;
          const logEntry = logs.find((l) => l.to_status === step);

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Dot */}
              <div className="flex flex-col items-center">
                <div
                  className="w-3 h-3 rounded-full transition-all duration-300"
                  style={{
                    background: isCompleted
                      ? isCurrent
                        ? 'var(--primary)'
                        : 'var(--success)'
                      : 'var(--border)',
                    boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none',
                  }}
                />
                <span
                  className="text-[9px] sm:text-[10px] mt-1.5 font-medium text-center whitespace-nowrap"
                  style={{
                    color: isCompleted ? 'var(--text)' : 'var(--text-muted)',
                  }}
                >
                  {SHORT_LABELS[step]}
                </span>
                {logEntry && (
                  <span className="text-[8px] text-text-muted mt-0.5">
                    {new Date(logEntry.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className="flex-1 h-[2px] mx-1 transition-all duration-300"
                  style={{
                    background: idx < currentIdx ? 'var(--success)' : 'var(--border)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {isRejected && (
        <div
          className="text-xs font-medium px-3 py-1.5 rounded-lg mt-1 inline-flex items-center gap-1"
          style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}
        >
          ⚠ Issue was rejected — awaiting rework
        </div>
      )}
    </div>
  );
}
