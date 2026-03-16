'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Alert, CircularProgress,
} from '@mui/material';
import { createAsset, updateAsset } from '@/actions/assetActions';
import type { AssetRow } from '@/types';

interface Props {
  open: boolean;
  asset?: AssetRow | null;
  onClose: () => void;
}

export function AssetFormDialog({ open, asset, onClose }: Props) {
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const isEdit = !!asset;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    startTransition(async () => {
      const res = isEdit ? await updateAsset(asset._id, data) : await createAsset(data);
      if (!res.success) return setError(res.error);
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth key={asset?._id ?? 'new'}>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {isEdit ? 'Edit Asset' : 'Add Asset'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="assetName" label="Asset Name" size="small" required fullWidth
                defaultValue={asset?.assetName ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="assetCode" label="Asset Code" size="small" required fullWidth
                defaultValue={asset?.assetCode ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="assetType" label="Type" size="small" select required fullWidth
                defaultValue={asset?.assetType ?? ''}>
                <MenuItem value="laptop">Laptop</MenuItem>
                <MenuItem value="desktop">Desktop</MenuItem>
                <MenuItem value="display">Display</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="location" label="Location" size="small" required fullWidth
                defaultValue={asset?.location ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="acquisitionDate" label="Acquisition Date" type="date" size="small" required fullWidth
                InputLabelProps={{ shrink: true }}
                defaultValue={asset?.acquisitionDate ? asset.acquisitionDate.split('T')[0] : ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="acquisitionCost" label="Cost (PHP)" type="number" size="small" required fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                defaultValue={asset?.acquisitionCost ?? ''} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField name="depreciationMethod" label="Depreciation" size="small" select fullWidth
                defaultValue={asset?.depreciationMethod ?? ''}>
                <MenuItem value="">None</MenuItem>
                <MenuItem value="straight-line">Straight-line</MenuItem>
                <MenuItem value="declining-balance">Declining Balance</MenuItem>
                <MenuItem value="custom">Custom (5-Year Accelerated)</MenuItem>
              </TextField>
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
