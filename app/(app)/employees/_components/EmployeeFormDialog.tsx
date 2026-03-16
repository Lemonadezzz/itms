'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Alert, CircularProgress,
} from '@mui/material';
import { createEmployee, updateEmployee } from '@/actions/employeeActions';
import type { EmployeeRow } from '@/lib/data/employees';

interface Props {
  open: boolean;
  employee: EmployeeRow | null;
  onClose: () => void;
}

export function EmployeeFormDialog({ open, employee, onClose }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isEdit = !!employee;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    startTransition(async () => {
      const res = isEdit
        ? await updateEmployee(employee._id, data)
        : await createEmployee(data);
      if (!res.success) return setError(res.error);
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {isEdit ? 'Edit Employee' : 'Add Employee'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="employeeName" label="Full Name" size="small" required fullWidth
                defaultValue={employee?.employeeName ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="department" label="Department" size="small" required fullWidth
                defaultValue={employee?.department ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="userType" label="User Type" size="small" select required fullWidth
                defaultValue={employee?.userType ?? ''}>
                <MenuItem value="support">Support</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="standardplus">Standard+</MenuItem>
                <MenuItem value="poweruser">Power User</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="location" label="Location" size="small" required fullWidth
                defaultValue={employee?.location ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="hireDate" label="Hire Date" type="date" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                defaultValue={employee?.hireDate ? employee.hireDate.split('T')[0] : ''} />
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
