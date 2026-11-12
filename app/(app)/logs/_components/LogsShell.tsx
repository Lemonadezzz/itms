'use client';

import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Stack, TextField, MenuItem, InputAdornment, Chip } from '@mui/material';
import { Search } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import type { LogRow } from '@/lib/data/logs';

const ACTION_COLORS: Record<string, string> = {
  create: '#22c55e',
  update: '#4085F0',
  delete: '#ef4444',
  assign: '#F05340',
  return: '#eab308',
  PRE_DELIVERY_INTAKE: '#8b5cf6',
  CONFIRM_DELIVERY: '#0ea5e9',
  ASSET_TRANSFER: '#f97316',
  ASSET_RETIRE: '#dc2626',
  ASSET_RESTORE: '#16a34a',
  ASSET_MAINTENANCE_START: '#f59e0b',
  ASSET_MAINTENANCE_END: '#10b981',
  offboard: '#ef4444',
  reactivate: '#22c55e',
  endContract: '#7c3aed',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  assign: 'Assign',
  return: 'Return',
  PRE_DELIVERY_INTAKE: 'Pre-delivery intake',
  CONFIRM_DELIVERY: 'Confirm delivery',
  ASSET_TRANSFER: 'Transfer',
  ASSET_RETIRE: 'Retire',
  ASSET_RESTORE: 'Restore',
  ASSET_MAINTENANCE_START: 'Maintenance start',
  ASSET_MAINTENANCE_END: 'Maintenance end',
  offboard: 'Inactivate',
  reactivate: 'Reactivate',
  endContract: 'End contract',
};

const ACTION_OPTIONS = [
  'create', 'update', 'delete', 'assign', 'return',
  'PRE_DELIVERY_INTAKE', 'CONFIRM_DELIVERY', 'ASSET_TRANSFER',
  'ASSET_RETIRE', 'ASSET_RESTORE', 'ASSET_MAINTENANCE_START',
  'ASSET_MAINTENANCE_END', 'offboard', 'reactivate', 'endContract',
];

const MODULE_LABELS: Record<string, string> = {
  Asset: 'Hardware',
  Employee: 'Assignments',
  Contract: 'Contracts',
};

interface Props {
  rows: LogRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
}

export function LogsShell({ rows, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<LogRow>[] = [
    {
      field: 'createdAt', headerName: 'Time', width: 150,
      renderCell: ({ value }) => new Date(value).toISOString(),
    },
    { field: 'userName',     headerName: 'User',        width: 140 },
    {
      field: 'action', headerName: 'Action', width: 150,
      renderCell: ({ value }) => (
        <Chip label={ACTION_LABELS[value] ?? value} size="small"
          sx={{ bgcolor: ACTION_COLORS[value] ?? '#888', color: '#fff', fontSize: '0.7rem', height: 20 }} />
      ),
    },
    {
      field: 'relatedModel', headerName: 'Module', width: 120,
      renderCell: ({ value }) => MODULE_LABELS[value] ?? value,
    },
    { field: 'description',  headerName: 'Description', flex: 1, minWidth: 200 },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1.5 }} suppressHydrationWarning>
      <Stack direction="row" gap={1}>
        <TextField
          size="small" placeholder="Search…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => pushParams({ search: e.target.value, page: 0 })}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment> }}
          sx={{ width: 220 }}
        />
        <TextField
          select size="small" label="Action"
          defaultValue={searchParams.get('action') ?? ''}
          onChange={(e) => pushParams({ action: e.target.value, page: 0 })}
          sx={{ width: 130 }}
          slotProps={{ htmlInput: { 'data-nh': '' } }}
        >
          <MenuItem value="">All</MenuItem>
          {ACTION_OPTIONS.map((a) => (
            <MenuItem key={a} value={a}>{ACTION_LABELS[a] ?? a}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={rows} columns={columns} getRowId={(r) => r._id}
          rowCount={total} paginationMode="server"
          pageSizeOptions={[50, 75, 100]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m: GridPaginationModel) => pushParams({ page: m.page, pageSize: m.pageSize })}
          disableRowSelectionOnClick
          sx={{ border: 0, flex: 1 }}
        />
      </Box>
    </Box>
  );
}
