'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, TextField,
} from '@mui/material';
import { deleteAccount, updateAccount } from '@/actions/accountActions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { AccountRow } from '@/lib/data/accounts';
import type { RoleRow } from '@/lib/data/roles';

interface Props {
  open: boolean;
  account: AccountRow | null;
  roles: RoleRow[];
  isDeveloper: boolean;
  onClose: () => void;
}

export function ManageAccountDialog({ open, account, roles, isDeveloper, onClose }: Props) {
  const [roleKey, setRoleKey] = useState('user');
  const [status, setStatus] = useState('Active');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setRoleKey(account?.roleKey ?? 'user');
    setStatus(account?.status === 'Inactive' ? 'Inactive' : 'Active');
    setPassword('');
    setError('');
    setConfirmDelete(false);
  }, [open, account?._id]);

  const availableRoles = roles.filter((role) => isDeveloper || role.key !== 'developer');

  function handleSubmit() {
    if (!account?.accountId) return;
    setError('');
    startTransition(async () => {
      const result = await updateAccount(account.accountId as string, {
        roleKey,
        status,
        password: password || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <>
      <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
          Manage Account: {account?.name}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField label="Name" size="small" fullWidth value={account?.name ?? ''} disabled />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Login Email"
                size="small"
                fullWidth
                value={account?.accountEmail ?? ''}
                disabled
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
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Status"
                size="small"
                fullWidth
                select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Reset Password"
                type="password"
                size="small"
                fullWidth
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                helperText="Leave blank to keep the current password."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ justifyContent: isDeveloper ? 'space-between' : 'flex-end' }}>
          {isDeveloper && (
            <Button color="error" onClick={() => setConfirmDelete(true)} disabled={isPending}>
              Delete Account
            </Button>
          )}
          <div>
            <Button onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit} disabled={isPending} sx={{ ml: 1 }}>
              Save
            </Button>
          </div>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${account?.name}'s account?`}
        message="This permanently deletes the login. The employee record is not affected."
        confirmLabel="Delete Account"
        onConfirm={async () => {
          if (!account?.accountId) return false;
          const result = await deleteAccount(account.accountId);
          if (!result.success) {
            setError(result.error);
            return false;
          }
          setConfirmDelete(false);
          onClose();
          return true;
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
