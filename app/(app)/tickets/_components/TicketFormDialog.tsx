'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Alert, CircularProgress,
} from '@mui/material';
import { createTicket, updateTicket } from '@/actions/ticketActions';
import type { TicketRow } from '@/lib/data/tickets';

interface Props {
  open: boolean;
  ticket: TicketRow | null;
  employees: { _id: string; employeeName: string }[];
  onClose: () => void;
}

export function TicketFormDialog({ open, ticket, employees, onClose }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isEdit = !!ticket;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const employeeId = fd.get('reportedBy') as string;
    const data = {
      ...Object.fromEntries(fd.entries()),
      reportedByName: employees.find((e) => e._id === employeeId)?.employeeName ?? '',
    };
    startTransition(async () => {
      const res = isEdit ? await updateTicket(ticket._id, data) : await createTicket(data);
      if (!res.success) return setError(res.error);
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {isEdit ? 'Edit Ticket' : 'New Ticket'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField name="subject" label="Subject" size="small" required fullWidth
                defaultValue={ticket?.subject ?? ''} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField name="details" label="Details" size="small" multiline rows={3} fullWidth
                defaultValue={''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="reportedBy" label="Reported By" size="small" select required fullWidth
                defaultValue={''}>
                {employees.map((e) => (
                  <MenuItem key={e._id} value={e._id}>{e.employeeName}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="status" label="Status" size="small" select required fullWidth
                defaultValue={ticket?.status ?? 'Open'}>
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="In-Progress">In-Progress</MenuItem>
                <MenuItem value="Closed">Closed</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="submittedDate" label="Submitted Date" type="date" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                defaultValue={ticket?.submittedDate ? ticket.submittedDate.split('T')[0] : new Date().toISOString().split('T')[0]} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" size="small" disabled={isPending}
            startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}>
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
