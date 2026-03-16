'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Alert, CircularProgress,
} from '@mui/material';
import { createSupplier, updateSupplier } from '@/actions/supplierActions';
import type { SupplierRow } from '@/lib/data/suppliers';

interface Props {
  open: boolean;
  supplier: SupplierRow | null;
  onClose: () => void;
}

export function SupplierFormDialog({ open, supplier, onClose }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isEdit = !!supplier;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    startTransition(async () => {
      const res = isEdit ? await updateSupplier(supplier._id, data) : await createSupplier(data);
      if (!res.success) return setError(res.error);
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {isEdit ? 'Edit Supplier' : 'Add Supplier'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField name="supplierName" label="Supplier Name" size="small" required fullWidth
                defaultValue={supplier?.supplierName ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="contactPerson" label="Contact Person" size="small" fullWidth
                defaultValue={supplier?.contactPerson ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="email" label="Email" type="email" size="small" fullWidth
                defaultValue={supplier?.email ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="telephoneNumber" label="Phone" size="small" fullWidth
                defaultValue={supplier?.telephoneNumber ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="categories" label="Categories (comma-separated)" size="small" fullWidth
                defaultValue={supplier?.categories.join(', ') ?? ''}
                helperText="e.g. Hardware, Networking, Software" />
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
