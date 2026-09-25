'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, CircularProgress, Typography
} from '@mui/material';
import { confirmDelivery } from '@/actions/assetActions';
import type { AssetRow } from '@/types';

interface Props {
  asset: AssetRow;
  onClose: () => void;
}

export function ConfirmDeliveryDialog({ asset, onClose }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await confirmDelivery(asset._id, new Date(fd.get('acquisitionDate') as string));
      if (!res.success) return setError(res.error);
      onClose();
    });
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        Confirm Delivery
        <Typography variant="caption" display="block" color="text.secondary">{asset.assetCode} — {asset.assetName}</Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} suppressHydrationWarning>
          {error && <Alert severity="error" sx={{ py: 0 }}>{error}</Alert>}
          <TextField name="acquisitionDate" label="Acquisition Date" type="date" size="small" required fullWidth
            InputLabelProps={{ shrink: true }}
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" size="small" disabled={isPending}
            startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}>
            Confirm
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
