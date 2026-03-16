'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Box, Button, Stack, TextField, InputAdornment,
  IconButton, Tooltip, Chip,
} from '@mui/material';
import { Add, Search, Edit, Delete } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { SupplierFormDialog } from './SupplierFormDialog';
import { deleteSupplier } from '@/actions/supplierActions';
import type { SupplierRow } from '@/lib/data/suppliers';

interface Props {
  rows: SupplierRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
}

export function SuppliersShell({ rows, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRow | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<SupplierRow>[] = [
    { field: 'supplierName',    headerName: 'Supplier',    flex: 1, minWidth: 160 },
    { field: 'contactPerson',   headerName: 'Contact',     width: 140 },
    { field: 'email',           headerName: 'Email',       width: 180 },
    { field: 'telephoneNumber', headerName: 'Phone',       width: 130 },
    {
      field: 'categories', headerName: 'Categories', width: 200,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {(value as string[]).map((c) => (
            <Chip key={c} label={c} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
          ))}
        </Box>
      ),
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
              onClick={() => confirm('Delete supplier?') && startTransition(async () => { await deleteSupplier(row._id); })}>
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
          Add Supplier
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

      <SupplierFormDialog
        open={dialogOpen} supplier={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
      />
    </Box>
  );
}
