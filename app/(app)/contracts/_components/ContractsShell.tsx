'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Button, Chip, IconButton, InputAdornment, Snackbar, Alert, Stack, TextField, Tooltip } from '@mui/material';
import { Add, Delete, EditNote, Search } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { AddContractDialog } from './AddContractDialog';
import { ContractDetailDialog } from './ContractDetailDialog';
import { ContractFormDialog } from './ContractFormDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteContract } from '@/actions/contractActions';
import type { ContractRow, EligibleContractOption } from '@/lib/data/contracts';

interface Props {
  rows: ContractRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-CA');
};

export function ContractsShell({ rows, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [addOpen, setAddOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContractRow | null>(null);
  const [initial, setInitial] = useState<EligibleContractOption | null>(null);
  const [detailTarget, setDetailTarget] = useState<ContractRow | null>(null);
  const [localRows, setLocalRows] = useState<ContractRow[]>(rows);
  const [deleteTarget, setDeleteTarget] = useState<ContractRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => setErrorMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  // Keep the optimistic copy in sync whenever the server sends fresh data.
  useEffect(() => {
    setLocalRows(rows);
    setDetailTarget((prev) => (prev ? rows.find((r) => r._id === prev._id) ?? prev : prev));
  }, [rows]);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setInitial(null);
  }

  const columns: GridColDef<ContractRow>[] = [
    { field: 'employeeName', headerName: 'Employee Name', flex: 1, minWidth: 180 },
    {
      field: 'assetName', headerName: 'Device Name', flex: 1, minWidth: 220,
      renderCell: ({ row }) => `${row.assetCode} - ${row.assetName}`,
    },
    {
      field: 'issuedDate', headerName: 'Issued Date', width: 130,
      renderCell: ({ value }) => formatDate(value as string),
    },
    {
      field: 'finishDate', headerName: 'Payment End', width: 130,
      renderCell: ({ value }) => formatDate(value as string),
    },
    { field: 'tenure', headerName: 'Tenure', width: 130 },
    {
      field: 'contractEnd', headerName: 'Contract End', width: 130,
      renderCell: ({ value }) => formatDate(value as string),
    },
    {
      field: 'contractStatus', headerName: 'Contract Status', width: 140,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip
            label={value as string}
            size="small"
            color={value === 'Active' ? 'success' : 'default'}
            sx={{ fontSize: '0.68rem', height: 20 }}
          />
        </Box>
      ),
    },
    {
      field: 'actions', headerName: '', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Manage Contract">
            <IconButton size="small" onClick={() => setDetailTarget(row)}>
              <EditNote sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Contract">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1.5 }} suppressHydrationWarning>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <TextField
          size="small" placeholder="Search…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => pushParams({ search: e.target.value, page: 0 })}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment> }}
          sx={{ width: 220 }}
        />
        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setAddOpen(true)}>
          Add Contract
        </Button>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={localRows} columns={columns} getRowId={(r) => r._id}
          rowCount={total} paginationMode="server"
          pageSizeOptions={[50, 75, 100]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m: GridPaginationModel) => pushParams({ page: m.page, pageSize: m.pageSize })}
          checkboxSelection
          sx={{ border: 0, flex: 1 }}
        />
      </Box>

      <AddContractDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSelect={(option) => {
          setAddOpen(false);
          setEditing(null);
          setInitial(option);
          setFormOpen(true);
        }}
      />

      {detailTarget && (
        <ContractDetailDialog
          contract={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => { setEditing(detailTarget); setInitial(null); setFormOpen(true); }}
          onUpdated={(updated) => {
            setLocalRows((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
            setDetailTarget(updated);
          }}
        />
      )}

      {formOpen && (
        <ContractFormDialog
          open
          contract={editing}
          initial={initial}
          onClose={closeForm}
          onCreated={() => router.refresh()}
          onUpdate={(updated) => {
            setLocalRows((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
            setDetailTarget((prev) => (prev && prev._id === updated._id ? updated : prev));
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete contract for ${deleteTarget?.employeeName ?? ''}?`}
        message={`This permanently deletes the contract for ${deleteTarget?.assetCode ?? ''} - ${deleteTarget?.assetName ?? ''}. Contracts must be deleted before their asset or employee.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return false;
          const res = await deleteContract(deleteTarget._id);
          if (!res.success) {
            setErrorMsg(res.error);
            return false;
          }
          setLocalRows((prev) => prev.filter((r) => r._id !== deleteTarget._id));
          setDetailTarget((prev) => (prev && prev._id === deleteTarget._id ? null : prev));
          setDeleteTarget(null);
          router.refresh();
          return true;
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={!!errorMsg}
        autoHideDuration={4000}
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
