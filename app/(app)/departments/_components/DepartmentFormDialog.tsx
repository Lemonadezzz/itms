'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Alert, CircularProgress,
} from '@mui/material';
import { createDepartment, updateDepartment } from '@/actions/departmentActions';
import type { DepartmentRow } from '@/lib/data/departments';

interface Props {
  open: boolean;
  department: DepartmentRow | null;
  onClose: () => void;
}

export function DepartmentFormDialog({ open, department, onClose }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isEdit = !!department;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    startTransition(async () => {
      const res = isEdit ? await updateDepartment(department._id, data) : await createDepartment(data);
      if (!res.success) return setError(res.error);
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {isEdit ? 'Edit Department' : 'Add Department'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent suppressHydrationWarning>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField name="departmentName" label="Department Name" size="small" required fullWidth
                defaultValue={department?.departmentName ?? ''} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField name="description" label="Description" size="small" fullWidth multiline minRows={2}
                defaultValue={department?.description ?? ''} />
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
