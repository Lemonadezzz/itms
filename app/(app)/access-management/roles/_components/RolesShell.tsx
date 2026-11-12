'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Chip, IconButton, InputAdornment, Stack, TextField, Tooltip } from '@mui/material';
import { Edit, Lock, Search } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { RolePermissionsDialog } from './RolePermissionsDialog';
import type { RoleRow } from '@/lib/data/roles';

interface Props {
  rows: RoleRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
  canManage: boolean;
}

export function RolesShell({ rows, total, page, pageSize, canManage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [editTarget, setEditTarget] = useState<RoleRow | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => params.set(key, String(value)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<RoleRow>[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 190,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
          <span>{row.name}</span>
          <Chip
            label={row.editable ? 'Editable' : 'Locked'}
            size="small"
            color={row.editable ? 'primary' : 'default'}
            sx={{ fontSize: '0.6rem', height: 18 }}
          />
        </Box>
      ),
    },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 280 },
    {
      field: 'userCount',
      headerName: 'Users',
      width: 90,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'permissions',
      headerName: 'Permissions',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Chip
          label={`${row.permissions.length} granted`}
          size="small"
          color={row.permissions.length > 0 ? 'primary' : 'default'}
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => {
        if (row.editable && canManage) {
          return (
            <Tooltip title="Edit Permissions">
              <IconButton size="small" onClick={() => setEditTarget(row)}>
                <Edit sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="System role — read only">
            <Lock sx={{ fontSize: 15, color: 'text.disabled' }} />
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
          getRowId={(row) => row.key}
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

      <RolePermissionsDialog
        open={!!editTarget}
        role={editTarget}
        onClose={() => {
          setEditTarget(null);
          router.refresh();
        }}
      />
    </Box>
  );
}
