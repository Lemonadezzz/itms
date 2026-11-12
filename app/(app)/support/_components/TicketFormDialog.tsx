'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { createTicket, updateTicket } from '@/actions/ticketActions';
import {
  AFFECTED_ITEM_TYPES,
  TICKET_TYPES,
  type AffectedItemType,
  type TicketType,
} from '@/lib/support';
import type { TicketFormOptions, TicketRow } from '@/lib/data/tickets';

interface Props {
  open: boolean;
  ticket: TicketRow | null;
  options: TicketFormOptions;
  onClose: () => void;
}

export function TicketFormDialog({ open, ticket, options, onClose }: Props) {
  const router = useRouter();
  const isEdit = !!ticket;
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const [subject, setSubject] = useState(ticket?.subject ?? '');
  const [type, setType] = useState<TicketType>((ticket?.type as TicketType) ?? 'Incident');
  const [category, setCategory] = useState(ticket?.category ?? '');
  const [requestedFor, setRequestedFor] = useState(
    ticket?.requestedForEmployeeId ?? ticket?.requestedForUserId ?? 'self'
  );
  const [affectedItemType, setAffectedItemType] = useState<AffectedItemType>(
    (ticket?.affectedItemType as AffectedItemType) ?? 'Other'
  );
  const [affectedAssetId, setAffectedAssetId] = useState(ticket?.affectedAssetId ?? '');
  const [affectedSoftwareId, setAffectedSoftwareId] = useState(ticket?.affectedSoftwareId ?? '');
  const [affectedItemOther, setAffectedItemOther] = useState(ticket?.affectedItemOther ?? '');
  const [description, setDescription] = useState(ticket?.description ?? '');

  const requestedEmployeeId =
    requestedFor === 'self' ? options.currentUser.employeeId : requestedFor;

  const categoryOptions = useMemo(() => {
    const matching = options.categories.filter(
      (item) => item.appliesTo === 'Both' || item.appliesTo === type
    );
    if (ticket && !matching.some((item) => item.label === ticket.category)) {
      return [
        ...matching,
        {
          key: `legacy-${ticket.category}`,
          label: ticket.category,
          appliesTo: 'Both' as const,
          active: false,
        },
      ];
    }
    return matching;
  }, [options.categories, ticket, type]);

  // Prefer hardware currently assigned to the requested-for employee, falling back
  // to every asset so an item can still be selected when nothing is assigned.
  const assetOptions = useMemo(() => {
    if (!requestedEmployeeId) return options.assets;
    const assigned = options.assets.filter((asset) => asset.employeeId === requestedEmployeeId);
    return assigned.length > 0 ? assigned : options.assets;
  }, [options.assets, requestedEmployeeId]);

  const softwareOptions = useMemo(() => {
    const employee = options.employees.find((item) => item._id === requestedEmployeeId);
    if (!employee || employee.softwareIds.length === 0) return options.software;
    const assigned = options.software.filter((item) => employee.softwareIds.includes(item._id));
    return assigned.length > 0 ? assigned : options.software;
  }, [options.employees, options.software, requestedEmployeeId]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!category) {
      setError('Select a category.');
      return;
    }
    if (affectedItemType === 'Hardware' && !affectedAssetId) {
      setError('Select the affected hardware.');
      return;
    }
    if (affectedItemType === 'Software' && !affectedSoftwareId) {
      setError('Select the affected software.');
      return;
    }
    if (affectedItemType === 'Other' && !affectedItemOther.trim()) {
      setError('Describe the affected item.');
      return;
    }

    const payload = {
      subject,
      description,
      type,
      category,
      requestedFor,
      affectedItemType,
      affectedAssetId: affectedItemType === 'Hardware' ? affectedAssetId : '',
      affectedSoftwareId: affectedItemType === 'Software' ? affectedSoftwareId : '',
      affectedItemOther: affectedItemType === 'Other' ? affectedItemOther : '',
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateTicket(ticket._id, payload)
        : await createTicket(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700, pb: 1 }}>
        {isEdit ? `Edit ${ticket.ticketNumber}` : 'New Ticket'}
        <Typography variant="caption" display="block" color="text.secondary">
          {isEdit
            ? 'Changes apply immediately and are recorded in the activity log.'
            : 'Tell us what you need help with. A technician will pick it up from the queue.'}
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, py: 0 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Subject"
                size="small"
                required
                fullWidth
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Type"
                size="small"
                required
                fullWidth
                value={type}
                onChange={(event) => {
                  const next = event.target.value as TicketType;
                  setType(next);
                  setCategory('');
                }}
              >
                {TICKET_TYPES.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Category"
                size="small"
                required
                fullWidth
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categoryOptions.map((option) => (
                  <MenuItem key={option.key} value={option.label}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Requested For"
                size="small"
                required
                fullWidth
                value={requestedFor}
                onChange={(event) => {
                  setRequestedFor(event.target.value);
                  setAffectedAssetId('');
                  setAffectedSoftwareId('');
                }}
                helperText="Raise this on behalf of a colleague if needed."
              >
                <MenuItem value="self">Me — {options.currentUser.name}</MenuItem>
                {options.employees.map((employee) => (
                  <MenuItem key={employee._id} value={employee._id}>
                    {employee.employeeName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Created By"
                size="small"
                fullWidth
                value={isEdit ? ticket.createdByName : options.currentUser.name}
                InputProps={{ readOnly: true }}
                helperText="Recorded automatically and cannot be changed."
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Affected Item Type"
                size="small"
                required
                fullWidth
                value={affectedItemType}
                onChange={(event) => {
                  setAffectedItemType(event.target.value as AffectedItemType);
                  setAffectedAssetId('');
                  setAffectedSoftwareId('');
                  setAffectedItemOther('');
                }}
              >
                {AFFECTED_ITEM_TYPES.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {affectedItemType === 'Hardware' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Hardware"
                  size="small"
                  required
                  fullWidth
                  value={affectedAssetId}
                  onChange={(event) => setAffectedAssetId(event.target.value)}
                >
                  {assetOptions.map((asset) => (
                    <MenuItem key={asset._id} value={asset._id}>
                      {asset.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {affectedItemType === 'Software' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Software"
                  size="small"
                  required
                  fullWidth
                  value={affectedSoftwareId}
                  onChange={(event) => setAffectedSoftwareId(event.target.value)}
                >
                  {softwareOptions.map((item) => (
                    <MenuItem key={item._id} value={item._id}>
                      {item.softwareName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {affectedItemType === 'Other' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Affected Item"
                  size="small"
                  required
                  fullWidth
                  value={affectedItemOther}
                  onChange={(event) => setAffectedItemOther(event.target.value)}
                  placeholder="e.g. Office printer, meeting room display"
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                size="small"
                required
                fullWidth
                multiline
                minRows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what happened, what you were doing, and any error messages."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button size="small" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}
          >
            {isEdit ? 'Save Changes' : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
