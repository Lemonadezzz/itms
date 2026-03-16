'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, CircularProgress, Divider, Typography,
} from '@mui/material';
import { updateProfile } from '@/actions/profileActions';

interface Props {
  open: boolean;
  name: string;
  email: string;
  onClose: () => void;
}

export function ProfileDialog({ open, name, email, onClose }: Props) {
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const fd   = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    // strip empty optional fields
    if (!data.newPassword)     delete data.newPassword;
    if (!data.currentPassword) delete data.currentPassword;
    startTransition(async () => {
      const res = await updateProfile(data);
      if (!res.success) return setError(res.error);
      setSuccess(true);
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Profile Settings</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error   && <Alert severity="error"   sx={{ py: 0 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ py: 0 }}>Profile updated successfully.</Alert>}

          <TextField name="name"  label="Name"  size="small" required fullWidth defaultValue={name} />
          <TextField name="email" label="Email" type="email" size="small" required fullWidth defaultValue={email} />

          <Divider>
            <Typography variant="caption" color="text.secondary">Change Password</Typography>
          </Divider>

          <TextField name="currentPassword" label="Current Password" type="password" size="small" fullWidth
            autoComplete="current-password" />
          <TextField name="newPassword" label="New Password" type="password" size="small" fullWidth
            autoComplete="new-password" inputProps={{ minLength: 8 }}
            helperText="Leave blank to keep current password" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={onClose}>Close</Button>
          <Button type="submit" variant="contained" size="small" disabled={isPending}
            startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
