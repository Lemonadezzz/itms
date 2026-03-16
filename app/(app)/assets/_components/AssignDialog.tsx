'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Alert, CircularProgress, Typography,
} from '@mui/material';
import { assignAsset } from '@/actions/assetActions';
import type { AssetRow } from '@/types';

interface Props {
  asset: AssetRow;
  employees: { _id: string; employeeName: string }[];
  onClose: () => void;
}

export function AssignDialog({ asset, employees, onClose }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const employeeId   = fd.get('employeeId') as string;
    const employeeName = employees.find((e) => e._id === employeeId)?.employeeName ?? '';
    startTransition(async () => {
      const res = await assignAsset(asset._id, {
        employeeId,
        employeeName,
        assignedDate: fd.get('assignedDate'),
        notes: fd.get('notes'),
      });
      if (!res.success) return setError(res.error);
      onClose();
    });
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        Assign Asset
        <Typography variant="caption" display="block" color="text.secondary">{asset.assetCode} — {asset.assetName}</Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
          <TextField name="employeeId" label="Employee" size="small" select required fullWidth defaultValue="">
            {employees.map((e) => (
              <MenuItem key={e._id} value={e._id}>{e.employeeName}</MenuItem>
            ))}
          </TextField>
          <TextField name="assignedDate" label="Assigned Date" type="date" size="small" required fullWidth
            InputLabelProps={{ shrink: true }}
            defaultValue={new Date().toISOString().split('T')[0]}
          />
          <TextField name="notes" label="Notes" size="small" multiline rows={2} fullWidth />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" size="small" disabled={isPending}
            startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}>
            Assign
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
