export const TICKET_TYPES = ['Incident', 'Service Request'] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const AFFECTED_ITEM_TYPES = ['Hardware', 'Software', 'Other'] as const;
export type AffectedItemType = (typeof AFFECTED_ITEM_TYPES)[number];

export const TICKET_STATUS_COLORS: Record<
  TicketStatus,
  'default' | 'info' | 'warning' | 'success' | 'error'
> = {
  Open: 'error',
  'In Progress': 'info',
  Pending: 'warning',
  Resolved: 'success',
  Closed: 'default',
};

export const AFFECTED_ITEM_COLORS: Record<string, string> = {
  Hardware: '#F05340',
  Software: '#4085F0',
  Other: '#8b5cf6',
};

/** Statuses a technician may move a ticket to, keyed by its current status. */
export const TECHNICIAN_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  Open: ['In Progress', 'Pending', 'Resolved'],
  'In Progress': ['Pending', 'Resolved'],
  Pending: ['In Progress', 'Resolved'],
  Resolved: ['Closed'],
  Closed: [],
};

/** A requester can only reopen or close a resolved ticket. */
export const REQUESTER_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus[]>> = {
  Resolved: ['Open', 'Closed'],
};

export const STATUS_ACTION_LABELS: Record<TicketStatus, string> = {
  Open: 'Reopen',
  'In Progress': 'Start Progress',
  Pending: 'Mark Pending',
  Resolved: 'Resolve',
  Closed: 'Close',
};

/** URL-safe slug used for Knowledge Base articles. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Human-friendly duration between two dates, e.g. "2d 4h". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
