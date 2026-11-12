'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Box, Chip, IconButton, InputAdornment, Stack, TextField, Tooltip,
} from '@mui/material';
import { ManageAccounts, PersonAdd, Search } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { AccountFormDialog } from './AccountFormDialog';
import { ManageAccountDialog } from './ManageAccountDialog';
import type { AccountRow } from '@/lib/data/accounts';
import type { RoleRow } from '@/lib/data/roles';

interface Props {
  rows: AccountRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
  roles: RoleRow[];
  canManage: boolean;
  isDeveloper: boolean;
}

const STATUS_COLORS: Record<string, 'success' | 'default' | 'warning'> = {
  Active: 'success',
  Inactive: 'default',
  'No Account': 'warning',
};

export function AccountsShell({ rows, total, page, pageSize, roles, canManage, isDeveloper }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [createTarget, setCreateTarget] = useState<AccountRow | null>(null);
  const [manageTarget, setManageTarget] = useState<AccountRow | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => params.set(key, String(value)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<AccountRow>[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 240,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
          <span>{row.name}</span>
          <Chip
            label={row.status}
            size="small"
            color={STATUS_COLORS[row.status] ?? 'default'}
            sx={{ fontSize: '0.65rem', height: 20 }}
          />
        </Box>
      ),
    },
    { field: 'department', headerName: 'Department', width: 220 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 110,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => {
        if (!canManage) return null;
        return row.accountId ? (
          <Tooltip title={`Manage Account${row.roleKey ? ` (${row.roleKey.replace('_', ' ')})` : ''}`}>
            <IconButton size="small" onClick={() => setManageTarget(row)}>
              <ManageAccounts sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Create Account">
            <IconButton size="small" onClick={() => setCreateTarget(row)}>
              <PersonAdd sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <TextField
          size="small"
          placeholder="Search…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(event) => pushParams({ search: event.target.value, page: 0 })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment>
            ),
          }}
          sx={{ width: 220 }}
        />
      </Stack>

      <Box sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row._id}
          rowCount={total}
          paginationMode="server"
          pageSizeOptions={[50, 75, 100]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model: GridPaginationModel) =>
            pushParams({ page: model.page, pageSize: model.pageSize })
          }
          sx={{ border: 0, flex: 1 }}
        />
      </Box>

      <AccountFormDialog
        open={!!createTarget}
        employee={createTarget}
        roles={roles}
        isDeveloper={isDeveloper}
        onClose={() => {
          setCreateTarget(null);
          router.refresh();
        }}
      />

      <ManageAccountDialog
        open={!!manageTarget}
        account={manageTarget}
        roles={roles}
        isDeveloper={isDeveloper}
        onClose={() => {
          setManageTarget(null);
          router.refresh();
        }}
      />
    </Box>
  );
}
