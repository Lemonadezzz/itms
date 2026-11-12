'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Box, Button, Stack, TextField, InputAdornment,
  IconButton, Tooltip, Snackbar, Alert,
} from '@mui/material';
import { Add, Search, Edit, Delete } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { DepartmentFormDialog } from './DepartmentFormDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteDepartment } from '@/actions/departmentActions';
import { useCan } from '@/lib/useCan';
import type { DepartmentRow } from '@/lib/data/departments';

interface Props {
  rows: DepartmentRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
}

export function DepartmentsShell({ rows, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const can = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<DepartmentRow>[] = [
    { field: 'departmentName', headerName: 'Department Name', flex: 1, minWidth: 220 },
    {
      field: 'description', headerName: 'Description', flex: 2, minWidth: 280,
      renderCell: ({ value }) => value || '—',
    },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable: false,
      align: 'center', headerAlign: 'center',
      renderCell: ({ row }) => {
        if (!can('departments.manage') && !can('departments.delete')) return null;
        return (
        <Box>
          {can('departments.manage') && (
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => { setEditing(row); setDialogOpen(true); }}>
              <Edit sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          )}
          {can('departments.delete') && (
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
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
        {can('departments.manage') && (
        <Button variant="contained" size="small" startIcon={<Add />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          Add Department
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

      <DepartmentFormDialog
        open={dialogOpen} department={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.departmentName ?? 'department'}?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return false;
          const res = await deleteDepartment(deleteTarget._id);
          if (!res.success) {
            setErrorMsg(res.error);
            return false;
          }
          setDeleteTarget(null);
          router.refresh();
          return true;
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={!!errorMsg}
        autoHideDuration={5000}
        onClose={() => setErrorMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
