'use client';

import { useState, useTransition, useEffect } from 'react';
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
  const [userType, setUserType] = useState('');
  const [status, setStatus] = useState('Active');
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Reset form when opening with different employee
  useEffect(() => {
    if (employee) {
      setUserType(employee.userType || '');
      setStatus(employee.status || 'Active');
      setFormData({
        employeeName: employee.employeeName || '',
        department: employee.department || '',
        location: employee.location || '',
        hiredAt: employee.hiredAt ? employee.hiredAt.split('T')[0] : '',
      });
    } else {
      setUserType('');
      setStatus('Active');
      setFormData({});
    }
  }, [open, employee?._id]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    data.userType = userType;
    if (isEdit) data.status = status;
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
        <DialogContent suppressHydrationWarning>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="employeeName" label="Full Name" size="small" required fullWidth
                value={formData.employeeName || ''} onChange={(e) => setFormData({...formData, employeeName: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="department" label="Department" size="small" required fullWidth
                value={formData.department || ''} onChange={(e) => setFormData({...formData, department: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="userType" label="User Type" size="small" select required fullWidth
                value={userType} onChange={(e) => setUserType(e.target.value)}>
                <MenuItem value="support">Support</MenuItem>
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="standardplus">Standard+</MenuItem>
                <MenuItem value="poweruser">Power User</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="location" label="Location" size="small" required fullWidth
                value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="hiredAt" label="Hire Date" type="date" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.hiredAt || ''} onChange={(e) => setFormData({...formData, hiredAt: e.target.value})} />
            </Grid>
            {isEdit && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField name="status" label="Status" size="small" select fullWidth
                  value={status} onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
              </Grid>
            )}
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
