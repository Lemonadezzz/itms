'use client';

import { useState } from 'react';
import { Box, TextField, MenuItem, InputAdornment, Autocomplete } from '@mui/material';
import { Search } from '@mui/icons-material';

interface Employee { _id: string; employeeName: string; }

interface Props {
  employees: Employee[];
  onFilter: (filters: Record<string, string>) => void;
}

export function AssetFiltersBar({ employees, onFilter }: Props) {
  const [search,     setSearch]     = useState('');
  const [assetType,  setType]       = useState('');
  const [isAssigned, setStatus]     = useState('');
  const [assignedTo, setAssignedTo] = useState<Employee | null>(null);

  function emit(overrides: Record<string, string>) {
    onFilter({ search, assetType, isAssigned, assignedToId: assignedTo?._id ?? '', ...overrides });
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      <TextField
        size="small" placeholder="Search…" value={search}
        onChange={(e) => { setSearch(e.target.value); emit({ search: e.target.value }); }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment> }}
        sx={{ width: 180 }}
      />

      <TextField
        select size="small" label="Type" value={assetType}
        onChange={(e) => { setType(e.target.value); emit({ assetType: e.target.value }); }}
        sx={{ width: 110 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="laptop">Laptop</MenuItem>
        <MenuItem value="desktop">Desktop</MenuItem>
        <MenuItem value="display">Display</MenuItem>
      </TextField>

      <TextField
        select size="small" label="Status" value={isAssigned}
        onChange={(e) => { setStatus(e.target.value); emit({ isAssigned: e.target.value }); }}
        sx={{ width: 120 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="true">Assigned</MenuItem>
        <MenuItem value="false">Available</MenuItem>
      </TextField>

      <Autocomplete
        size="small"
        options={employees}
        getOptionLabel={(o) => o.employeeName}
        value={assignedTo}
        onChange={(_, val) => {
          setAssignedTo(val);
          emit({ assignedToId: val?._id ?? '' });
        }}
        isOptionEqualToValue={(o, v) => o._id === v._id}
        renderInput={(params) => (
          <TextField {...params} label="Assigned To" placeholder="Type to search…" />
        )}
        sx={{ width: 200 }}
        clearOnEscape
      />
    </Box>
  );
}
