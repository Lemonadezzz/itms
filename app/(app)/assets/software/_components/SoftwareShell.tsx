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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteSoftware } from '@/actions/softwareActions';
import { useCan } from '@/lib/useCan';
import type { SoftwareRow } from '@/lib/data/software';

const CATEGORY_COLORS: Record<string, string> = {
  'Commercial / Paid License': '#8b5cf6',
  'Internal / In-house App':   '#0ea5e9',
  'Free / Enterprise Utility': '#269066',
  'SaaS Subscription':         '#F05340',
};

const STATUS_COLORS: Record<string, string> = {
  'Active':              '#22c55e',
  'Deprecated / Legacy': '#9ca3af',
  'In Development':      '#4085F0',
  'Under Review':        '#eab308',
};

const chipSx = (color?: string) => ({
  bgcolor: color ?? '#888',
  color: '#fff',
  fontSize: '0.65rem',
  height: 20,
});

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
  const can = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SoftwareRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SoftwareRow | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<SoftwareRow>[] = [
    { field: 'softwareName', headerName: 'Name', flex: 1, minWidth: 200 },
    {
      field: 'category', headerName: 'Category', width: 230,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip label={value as string} size="small" sx={chipSx(CATEGORY_COLORS[value as string])} />
        </Box>
      ),
    },
    {
      field: 'status', headerName: 'Status', width: 170,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip label={value as string} size="small" sx={chipSx(STATUS_COLORS[value as string])} />
        </Box>
      ),
    },
    {
      field: 'licenseType', headerName: 'License Type', width: 180,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {value
            ? <Chip label={value as string} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
            : '—'}
        </Box>
      ),
    },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      align: 'center', headerAlign: 'center',
      renderCell: ({ row }) => {
        if (!can('software.manage') && !can('software.delete')) return null;
        return (
        <Box>
          {can('software.manage') && (
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => { setEditing(row); setDialogOpen(true); }}>
              <Edit sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          )}
          {can('software.delete') && (
          <Tooltip title="Delete">
            <IconButton size="small" color="error"
              onClick={() => setDeleteTarget(row)}>
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          )}
        </Box>
        );
      },
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
        {can('software.manage') && (
        <Button variant="contained" size="small" startIcon={<Add />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          Add Software
        </Button>
        )}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.softwareName}?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return false;
          await deleteSoftware(deleteTarget._id);
          setDeleteTarget(null);
          return true;
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
