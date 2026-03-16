'use client';

import { useState } from 'react';
import { Box, TextField, MenuItem, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';

interface Props {
  onFilter: (filters: Record<string, string>) => void;
}

export function AssetFiltersBar({ onFilter }: Props) {
  const [search, setSearch]     = useState('');
  const [assetType, setType]    = useState('');
  const [isAssigned, setStatus] = useState('');

  function emit(overrides: Record<string, string>) {
    onFilter({ search, assetType, isAssigned, ...overrides });
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <TextField
        size="small"
        placeholder="Search…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); emit({ search: e.target.value }); }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment> }}
        sx={{ width: 200 }}
      />
      <TextField
        select size="small" label="Type" value={assetType}
        onChange={(e) => { setType(e.target.value); emit({ assetType: e.target.value }); }}
        sx={{ width: 120 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="laptop">Laptop</MenuItem>
        <MenuItem value="desktop">Desktop</MenuItem>
        <MenuItem value="display">Display</MenuItem>
      </TextField>
      <TextField
        select size="small" label="Status" value={isAssigned}
        onChange={(e) => { setStatus(e.target.value); emit({ isAssigned: e.target.value }); }}
        sx={{ width: 130 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="true">Assigned</MenuItem>
        <MenuItem value="false">Available</MenuItem>
      </TextField>
    </Box>
  );
}
