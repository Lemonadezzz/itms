'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Button, Stack, TextField, InputAdornment, IconButton, Tooltip, Chip, Snackbar, Alert } from '@mui/material';
import { Add, Delete, Search, EditNote, PersonRemove, TransferWithinAStation } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { EmployeeDetailDialog } from './EmployeeDetailDialog';
import { deleteEmployee, offboardEmployee } from '@/actions/employeeActions';
import { OffboardEmployeeModal } from './OffboardEmployeeModal';
import { reactivateEmployee } from '@/actions/employeeActions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EMPLOYEE_CONTRACT_BADGE_COLORS } from '@/lib/employeeBadges';
import type { EmployeeContractBadge } from '@/lib/employeeBadges';
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
  const [detailTarget, setDetailTarget] = useState<EmployeeRow | null>(null);
  const [localRows, setLocalRows] = useState<EmployeeRow[]>(rows);
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [offboardingEmployeeId, setOffboardingEmployeeId] = useState<string | null>(null);
  const [offboardingEmployeeName, setOffboardingEmployeeName] = useState<string>('');
  const [isOffboardAction, setIsOffboardAction] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null);
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

  const handleAction = (row: EmployeeRow, isOffboard: boolean) => {
    setIsOffboardAction(isOffboard);
    setOffboardingEmployeeId(row._id);
    setOffboardingEmployeeName(row.employeeName);
    setOffboardOpen(true);
  };

  const columns: GridColDef<EmployeeRow>[] = [
    { field: 'employeeName', headerName: 'Name',       flex: 1, minWidth: 160 },
    { field: 'email',        headerName: 'Email',      width: 240,
      renderCell: ({ value }) => value || '-',
    },
    { field: 'department',   headerName: 'Department', width: 150 },
    { field: 'companyTenure', headerName: 'Company Tenure', width: 150 },
    { field: 'status',       headerName: 'Status',     width: 100 },
    {
      field: 'assignedAssetCount', headerName: 'Assigned Devices', width: 150,
      renderCell: ({ value }) => {
        const count = value as number;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Chip
              label={count}
              color={count > 0 ? 'primary' : 'default'}
              size="small"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          </Box>
        );
      },
    },
    {
      field: 'contractBadge', headerName: 'Contracts', width: 120,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip
            label={value as string}
            size="small"
            color={EMPLOYEE_CONTRACT_BADGE_COLORS[value as EmployeeContractBadge]}
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        </Box>
      ),
    },
    {
      field: 'actions', headerName: '', width: 170, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Manage Employee">
            <IconButton size="small" onClick={() => setDetailTarget(row)}>
              <EditNote sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          {row.status === 'Active' ? (
            <Tooltip title={row.contractBadge === 'Active' ? 'Employee has an active contract' : 'Inactivate'}>
              <span>
                <IconButton
                  size="small"
                  color="error"
                  disabled={row.contractBadge === 'Active'}
                  onClick={() => handleAction(row, true)}
                >
                  <PersonRemove sx={{ fontSize: 15 }} />
                </IconButton>
              </span>
            </Tooltip>
          ) : (
            <Tooltip title="Reactivate">
              <IconButton size="small" color="success" onClick={() => handleAction(row, false)}>
                <TransferWithinAStation sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete Employee">
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
        <Button variant="contained" size="small" startIcon={<Add />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          Add Employee
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

      {detailTarget && (
        <EmployeeDetailDialog
          employee={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => { setEditing(detailTarget); setDialogOpen(true); }}
        />
      )}

      <EmployeeFormDialog
        open={dialogOpen} employee={editing}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        onUpdate={(updated) => {
          setLocalRows((prev) => prev.map((r) => (r._id === updated._id ? { ...r, ...updated } : r)));
          setDetailTarget((prev) => (prev && prev._id === updated._id ? { ...prev, ...updated } : prev));
        }}
      />

      <OffboardEmployeeModal
        key={offboardingEmployeeId}
        open={offboardOpen}
        employeeId={offboardingEmployeeId ?? ''}
        employeeName={offboardingEmployeeName}
        isOffboard={isOffboardAction}
        onClose={() => { setOffboardOpen(false); setOffboardingEmployeeId(null); setOffboardingEmployeeName(''); setIsOffboardAction(true); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.employeeName ?? 'employee'}?`}
        message="This permanently deletes the employee. Delete their contract first, then their assigned assets."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return false;
          const res = await deleteEmployee(deleteTarget._id);
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
