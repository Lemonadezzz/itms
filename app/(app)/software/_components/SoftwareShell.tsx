'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Box, Button, Stack, TextField, InputAdornment,
  IconButton, Tooltip, Chip,
} from '@mui/material';
import { Add, Search, Edit, Delete } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { SoftwareFormDialog } from './SoftwareFormDialog';
import { deleteSoftware } from '@/actions/softwareActions';
import type { SoftwareRow } from '@/lib/data/software';

const phpFormat = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

const LICENSE_COLORS: Record<string, string> = {
  monthly:   '#4085F0',
  annually:  '#269066',
  '3_years': '#F05340',
  perpetual: '#8b5cf6',
};

interface Props {
  rows: SoftwareRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
  suppliers: { _id: string; supplierName: string }[];
}

export function SoftwareShell({ rows, total, page, pageSize, suppliers }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SoftwareRow | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<SoftwareRow>[] = [
    { field: 'softwareName', headerName: 'Software', flex: 1, minWidth: 160 },
    {
      field: 'licenseType', headerName: 'License', width: 110,
      renderCell: ({ value }) => (
        <Chip label={value} size="small"
          sx={{ bgcolor: LICENSE_COLORS[value] ?? '#888', color: '#fff', fontSize: '0.7rem', height: 20 }} />
      ),
    },
    {
      field: 'acquisitionDate', headerName: 'Acquired', width: 110,
      renderCell: ({ value }) => new Date(value).toLocaleDateString(),
    },
    {
      field: 'acquisitionCost', headerName: 'Cost', width: 130,
      renderCell: ({ value }) => <span style={{ fontSize: '0.72rem' }}>{phpFormat(value as number)}</span>,
    },
    {
      field: 'monthlyCost', headerName: 'Monthly', width: 120,
      renderCell: ({ value }) => value ? <span style={{ fontSize: '0.72rem' }}>{phpFormat(value as number)}</span> : '—',
    },
    {
      field: 'actions', headerName: '', width: 80, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => { setEditing(row); setDialogOpen(true); }}>
              <Edit sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error"
              onClick={() => confirm('Delete software?') && startTransition(async () => { await deleteSoftware(row._id); })}>
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <TextField
          size="small" placeholder="Search…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => pushParams({ search: e.target.value, page: 0 })}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment> }}
          sx={{ width: 220 }}
        />
        <Button variant="contained" size="small" startIcon={<Add />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          Add Software
        </Button>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={rows} columns={columns} getRowId={(r) => r._id}
          rowCount={total} paginationMode="server"
          pageSizeOptions={[50, 75, 100]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m: GridPaginationModel) => pushParams({ page: m.page, pageSize: m.pageSize })}
          sx={{ border: 0, flex: 1 }}
        />
      </Box>

      <SoftwareFormDialog
        open={dialogOpen} software={editing} suppliers={suppliers}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
      />
    </Box>
  );
}
