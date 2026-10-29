'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Button, Chip, IconButton, InputAdornment, Stack, TextField, Tooltip } from '@mui/material';
import { Add, EditNote, Search } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { AddContractDialog } from './AddContractDialog';
import { ContractDetailDialog } from './ContractDetailDialog';
import { ContractFormDialog } from './ContractFormDialog';
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
    {
      field: 'status', headerName: 'Payroll Deductions', width: 160,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip
            label={value as string}
            size="small"
            color={value === 'Fully Paid' ? 'success' : 'warning'}
            sx={{ fontSize: '0.68rem', height: 20 }}
          />
        </Box>
      ),
    },
    {
      field: 'actions', headerName: '', width: 80, sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title="Manage Contract">
          <IconButton size="small" onClick={() => setDetailTarget(row)}>
            <EditNote sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
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
    </Box>
  );
}
