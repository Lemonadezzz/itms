'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField,
} from '@mui/material';
import { createAccount } from '@/actions/accountActions';
import type { AccountRow } from '@/lib/data/accounts';
import type { RoleRow } from '@/lib/data/roles';

interface Props {
  open: boolean;
  employee: AccountRow | null;
  roles: RoleRow[];
  isDeveloper: boolean;
  onClose: () => void;
}

export function AccountFormDialog({ open, employee, roles, isDeveloper, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleKey, setRoleKey] = useState('user');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setEmail(employee?.email ?? '');
    setPassword('');
    setRoleKey('user');
    setError('');
  }, [open, employee?._id]);

  const availableRoles = roles.filter((role) => isDeveloper || role.key !== 'developer');

  function handleSubmit() {
    if (!employee) return;
    setError('');
    startTransition(async () => {
      const result = await createAccount({
        employeeId: employee.employeeId,
        name: employee.name,
        email,
        password,
        roleKey,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        Create Account: {employee?.name}
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField label="Name" size="small" fullWidth value={employee?.name ?? ''} disabled />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Login Email"
              type="email"
              size="small"
              fullWidth
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              helperText="Defaults to the employee email. You can override it."
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Password"
              type="password"
              size="small"
              fullWidth
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              helperText="At least 8 characters."
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Role"
              size="small"
              fullWidth
              select
              value={roleKey}
              onChange={(event) => setRoleKey(event.target.value)}
            >
              {availableRoles.map((role) => (
                <MenuItem key={role.key} value={role.key}>
                  {role.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isPending || !email || password.length < 8}>
          Create Account
        </Button>
      </DialogActions>
    </Dialog>
  );
}
