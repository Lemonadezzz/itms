'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, Delete, Edit, History, PersonAddAlt1 } from '@mui/icons-material';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { assignTicket, deleteTicket, updateTicketStatus } from '@/actions/ticketActions';
import {
  REQUESTER_TRANSITIONS,
  STATUS_ACTION_LABELS,
  TECHNICIAN_TRANSITIONS,
  TICKET_STATUS_COLORS,
  type TicketStatus,
} from '@/lib/support';
import type { TechnicianOption, TicketRow } from '@/lib/data/tickets';

interface Props {
  ticket: TicketRow;
  technicians: TechnicianOption[];
  currentUserId: string;
  currentEmployeeId?: string;
  canManage: boolean;
  isTechnician: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const STATUS_BUTTON_COLORS: Record<
  TicketStatus,
  'primary' | 'info' | 'warning' | 'success' | 'inherit'
> = {
  Open: 'primary',
  'In Progress': 'info',
  Pending: 'warning',
  Resolved: 'success',
  Closed: 'inherit',
};

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export function TicketDetailDialog({
  ticket,
  technicians,
  currentUserId,
  currentEmployeeId,
  canManage,
  isTechnician,
  canDelete,
  onClose,
  onEdit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignee, setAssignee] = useState(ticket.assignedTechnicianId ?? '');

  const status = ticket.status as TicketStatus;
  const isRequester =
    ticket.createdById === currentUserId ||
    ticket.requestedForUserId === currentUserId ||
    (!!currentEmployeeId && ticket.requestedForEmployeeId === currentEmployeeId);

  const technicianCan = isTechnician && canManage;
  const transitions = technicianCan
    ? TECHNICIAN_TRANSITIONS[status]
    : isRequester
      ? REQUESTER_TRANSITIONS[status] ?? []
      : [];

  function transitionTo(next: TicketStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateTicketStatus(ticket._id, next);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleAssign() {
    setError(null);
    startTransition(async () => {
      const result = await assignTicket(ticket._id, assignee);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {ticket.ticketNumber}
            </Typography>
            <Chip
              label={ticket.status}
              size="small"
              color={TICKET_STATUS_COLORS[status] ?? 'default'}
              sx={{ height: 20, fontSize: '0.68rem' }}
            />
            <Chip label={ticket.type} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
            <Chip label={ticket.category} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
            {ticket.reopenedCount > 0 && (
              <Chip
                label={`Reopened ${ticket.reopenedCount}×`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.68rem' }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Close">
              <IconButton size="small" onClick={onClose}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Typography component="div" variant="subtitle1" fontWeight={700} sx={{ mt: 0.75 }}>
            {ticket.subject}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta label="Requested For" value={ticket.requestedForName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta label="Created By" value={ticket.createdByName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta label="Submitted" value={formatDateTime(ticket.submittedDate)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta label="Assigned Technician" value={ticket.assignedTechnicianName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta label="Resolved By" value={ticket.resolvedByName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta label="Closed By" value={ticket.closedByName} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta
                label="Affected Item"
                value={
                  ticket.affectedItemType === 'Other'
                    ? ticket.affectedItemOther || 'Other'
                    : ticket.affectedItemName
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta label="Affected Item Type" value={ticket.affectedItemType} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Meta
                label="Resolved / Closed"
                value={`${formatDate(ticket.resolvedAt)} / ${formatDate(ticket.closedAt)}`}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {ticket.description || 'No description provided.'}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <History sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Status History
                </Typography>
              </Stack>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {ticket.statusHistory.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No history recorded yet.
                  </Typography>
                )}
                {ticket.statusHistory.map((event, index) => (
                  <Box
                    key={`${event.status}-${event.at}-${index}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <Chip
                      label={event.status}
                      size="small"
                      color={TICKET_STATUS_COLORS[event.status as TicketStatus] ?? 'default'}
                      sx={{ height: 18, fontSize: '0.62rem', minWidth: 84 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(event.at)}
                      {event.byName ? ` · ${event.byName}` : ''}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>

            {technicianCan && (
              <Grid size={{ xs: 12 }}>
                <Divider />
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  sx={{ mt: 2 }}
                >
                  <TextField
                    select
                    size="small"
                    label="Assigned Technician"
                    value={assignee}
                    onChange={(event) => setAssignee(event.target.value)}
                    sx={{ minWidth: 240 }}
                    disabled={ticket.status === 'Closed'}
                  >
                    <MenuItem value="">
                      <em>Unassigned</em>
                    </MenuItem>
                    {technicians.map((technician) => (
                      <MenuItem key={technician._id} value={technician._id}>
                        {technician.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PersonAddAlt1 />}
                    disabled={
                      isPending ||
                      !assignee ||
                      assignee === (ticket.assignedTechnicianId ?? '') ||
                      ticket.status === 'Closed'
                    }
                    onClick={handleAssign}
                  >
                    Assign
                  </Button>
                </Stack>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button size="small" onClick={onClose}>
            Close
          </Button>
          <Box sx={{ flex: 1 }} />
          {canDelete && (
            <Button
              size="small"
              color="error"
              startIcon={<Delete />}
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
            >
              Delete
            </Button>
          )}
          {canManage && (
            <Button size="small" startIcon={<Edit />} onClick={onEdit} disabled={isPending}>
              Edit
            </Button>
          )}
          {transitions.map((next) => (
            <Button
              key={next}
              size="small"
              variant="contained"
              color={STATUS_BUTTON_COLORS[next]}
              disabled={isPending}
              startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}
              onClick={() => transitionTo(next)}
            >
              {STATUS_ACTION_LABELS[next]}
            </Button>
          ))}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${ticket.ticketNumber}?`}
        message="This permanently removes the ticket. Only a Developer can do this."
        confirmLabel="Delete"
        onConfirm={async () => {
          const result = await deleteTicket(ticket._id);
          if (!result.success) {
            setError(result.error);
            return false;
          }
          setConfirmDelete(false);
          router.refresh();
          onClose();
          return true;
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
