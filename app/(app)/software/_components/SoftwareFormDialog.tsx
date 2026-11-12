'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Alert, CircularProgress,
  Divider, Typography,
} from '@mui/material';
import { createSoftware, updateSoftware } from '@/actions/softwareActions';
import {
  SOFTWARE_CATEGORIES,
  SOFTWARE_LICENSE_TYPES,
  SOFTWARE_STATUSES,
} from '@/lib/software';
import type { SoftwareRow } from '@/lib/data/software';

interface Props {
  open: boolean;
  software: SoftwareRow | null;
  suppliers: { _id: string; supplierName: string }[];
  onClose: () => void;
}

const dateValue = (value?: string) => (value ? value.split('T')[0] : '');

export function SoftwareFormDialog({ open, software, suppliers, onClose }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isEdit = !!software;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    startTransition(async () => {
      const res = isEdit ? await updateSoftware(software._id, data) : await createSoftware(data);
      if (!res.success) return setError(res.error);
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {isEdit ? 'Edit Software' : 'Add Software'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent suppressHydrationWarning>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField name="softwareName" label="Software Name" size="small" required fullWidth
                defaultValue={software?.softwareName ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="category" label="Category" size="small" select required fullWidth
                defaultValue={software?.category ?? ''}>
                {SOFTWARE_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="status" label="Status" size="small" select required fullWidth
                defaultValue={software?.status ?? 'Active'}>
                {SOFTWARE_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="appOwner" label="App Owner" size="small" fullWidth
                defaultValue={software?.appOwner ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="supportLink" label="Support Doc / Portal Link" size="small" fullWidth
                placeholder="https://…"
                defaultValue={software?.supportLink ?? ''} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />
          <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
            Licenses &amp; Financials
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="licenseType" label="License Type" size="small" select fullWidth
                defaultValue={software?.licenseType ?? ''}>
                <MenuItem value="">None</MenuItem>
                {SOFTWARE_LICENSE_TYPES.map((license) => (
                  <MenuItem key={license} value={license}>{license}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="supplierId" label="Supplier / Vendor" size="small" select fullWidth
                defaultValue={software?.supplierId ?? ''}>
                <MenuItem value="">None</MenuItem>
                {suppliers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.supplierName}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="acquisitionDate" label="Acquisition Date" type="date" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                defaultValue={dateValue(software?.acquisitionDate)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="renewalDate" label="Renewal / Expiry Date" type="date" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                defaultValue={dateValue(software?.renewalDate)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="acquisitionCost" label="Cost / Subscription Fee (PHP)" type="number" size="small" fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                defaultValue={software?.acquisitionCost ?? ''} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" size="small" disabled={isPending}
            startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}>
            {isEdit ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
