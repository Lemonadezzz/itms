'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Alert, CircularProgress,
} from '@mui/material';
import { createSoftware, updateSoftware } from '@/actions/softwareActions';
import type { SoftwareRow } from '@/lib/data/software';

interface Props {
  open: boolean;
  software: SoftwareRow | null;
  suppliers: { _id: string; supplierName: string }[];
  onClose: () => void;
}

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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {isEdit ? 'Edit Software' : 'Add Software'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField name="softwareName" label="Software Name" size="small" required fullWidth
                defaultValue={software?.softwareName ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="licenseType" label="License Type" size="small" select required fullWidth
                defaultValue={software?.licenseType ?? ''}>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="annually">Annually</MenuItem>
                <MenuItem value="3_years">3 Years</MenuItem>
                <MenuItem value="perpetual">Perpetual</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="supplierId" label="Supplier" size="small" select fullWidth
                defaultValue={software?.supplierId ?? ''}>
                <MenuItem value="">None</MenuItem>
                {suppliers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.supplierName}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="acquisitionDate" label="Acquisition Date" type="date" size="small" required fullWidth
                InputLabelProps={{ shrink: true }}
                defaultValue={software?.acquisitionDate ? software.acquisitionDate.split('T')[0] : ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="acquisitionCost" label="Cost (PHP)" type="number" size="small" required fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                defaultValue={software?.acquisitionCost ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="monthlyCost" label="Monthly Cost (PHP)" type="number" size="small" fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                defaultValue={software?.monthlyCost ?? ''} />
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
