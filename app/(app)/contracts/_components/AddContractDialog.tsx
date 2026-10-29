'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, InputAdornment, List, ListItemButton, TextField, Typography,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { fetchEligibleLaptopEmployees } from '@/actions/contractActions';
import type { EligibleContractOption } from '@/lib/data/contracts';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (option: EligibleContractOption) => void;
}

export function AddContractDialog({ open, onClose, onSelect }: Props) {
  const [options, setOptions] = useState<EligibleContractOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setSearch('');
    setSelectedKey('');
    fetchEligibleLaptopEmployees()
      .then((res) => {
        if (cancelled) return;
        if (res.success) setOptions(res.data);
        else setError(res.error);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load eligible employees.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) =>
      o.employeeName.toLowerCase().includes(term) ||
      o.assetName.toLowerCase().includes(term) ||
      o.assetCode.toLowerCase().includes(term)
    );
  }, [options, search]);

  const selected = options.find((o) => `${o.employeeId}:${o.assetId}` === selectedKey) ?? null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        Add Contract
        <Typography variant="caption" display="block" color="text.secondary">
          Select an employee who is currently issued a laptop.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}

        <TextField
          size="small"
          placeholder="Search employee or laptop…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment>,
          }}
          sx={{ mb: 1.5 }}
        />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            {options.length === 0
              ? 'No employees currently have an un-contracted laptop issued.'
              : 'No employees match your search.'}
          </Typography>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 360, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {filtered.map((option) => {
              const key = `${option.employeeId}:${option.assetId}`;
              const isSelected = key === selectedKey;
              return (
                <ListItemButton
                  key={key}
                  selected={isSelected}
                  onClick={() => setSelectedKey(key)}
                  sx={{ alignItems: 'flex-start', borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{option.employeeName}</Typography>
                      <Chip
                        label={option.employeeStatus}
                        size="small"
                        color={option.employeeStatus === 'Active' ? 'success' : 'default'}
                        sx={{ height: 18, fontSize: '0.62rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {option.assetName} · <span style={{ fontFamily: 'monospace' }}>{option.assetCode}</span>
                      {' · '}Issued {new Date(option.issuedDate).toLocaleDateString('en-CA')}
                    </Typography>
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button size="small" onClick={onClose}>Cancel</Button>
        <Button
          size="small"
          variant="contained"
          disabled={!selected}
          onClick={() => { if (selected) onSelect(selected); }}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
