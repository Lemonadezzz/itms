'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Button, Stack, TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import { Add, Search, Edit, Delete, PersonRemove, TransferWithinAStation } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { deleteEmployee, offboardEmployee } from '@/actions/employeeActions';
import { OffboardEmployeeModal } from './OffboardEmployeeModal';
import { reactivateEmployee } from '@/actions/employeeActions';
import type { EmployeeRow } from '@/lib/data/employees';

interface Props {
  rows: EmployeeRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
}

export function EmployeesShell({ rows, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [offboardingEmployeeId, setOffboardingEmployeeId] = useState<string | null>(null);
  const [offboardingEmployeeName, setOffboardingEmployeeName] = useState<string>('');
  const [isOffboardAction, setIsOffboardAction] = useState(true);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const handleAction = (row: EmployeeRow, isOffboard: boolean) => {
    setIsOffboardAction(isOffboard);
    setOffboardingEmployeeId(row._id);
    setOffboardingEmployeeName(row.employeeName);
    setOffboardOpen(true);
  };

  const columns: GridColDef<EmployeeRow>[] = [
    { field: 'employeeName', headerName: 'Name',       flex: 1, minWidth: 160 },
    { field: 'department',   headerName: 'Department', width: 150 },
    { field: 'userType',     headerName: 'User Type',  width: 120 },
    { field: 'location',     headerName: 'Location',   width: 120 },
    { field: 'status',       headerName: 'Status',     width: 100 },
    {
      field: 'actions', headerName: '', width: 140, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => { setEditing(row); setDialogOpen(true); }}>
              <Edit sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          {row.status === 'Active' ? (
            <Tooltip title="Inactivate">
              <IconButton size="small" color="error"
                onClick={() => handleAction(row, true)}>
                <PersonRemove sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Reactivate">
              <IconButton size="small" color="success" onClick={() => handleAction(row, false)}>
                <TransferWithinAStation sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
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
        <Button variant="contained" size="small" startIcon={<Add />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          Add Employee
        </Button>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={rows} columns={columns} getRowId={(r) => r._id}
          rowCount={total} paginationMode="server"
          pageSizeOptions={[50, 75, 100]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m: GridPaginationModel) => pushParams({ page: m.page, pageSize: m.pageSize })}
          checkboxSelection
          sx={{ border: 0, flex: 1 }}
        />
      </Box>

      <EmployeeFormDialog
        open={dialogOpen} employee={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
      />

      <OffboardEmployeeModal
        key={offboardingEmployeeId}
        open={offboardOpen}
        employeeId={offboardingEmployeeId ?? ''}
        employeeName={offboardingEmployeeName}
        isOffboard={isOffboardAction}
        onClose={() => { setOffboardOpen(false); setOffboardingEmployeeId(null); setOffboardingEmployeeName(''); setIsOffboardAction(true); }}
      />
    </Box>
  );
}
