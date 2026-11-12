'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Stack, TextField, InputAdornment, IconButton, Tooltip, Chip } from '@mui/material';
import { Search, EditNote } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { EmployeeDetailDialog } from './EmployeeDetailDialog';
import { EMPLOYEE_CONTRACT_BADGE_COLORS } from '@/lib/employeeBadges';
import type { EmployeeContractBadge } from '@/lib/employeeBadges';
import type { EmployeeRow } from '@/lib/data/employees';

interface Props {
  rows: EmployeeRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
}

export function AssignmentsShell({ rows, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [detailTarget, setDetailTarget] = useState<EmployeeRow | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const countCell = (count: number) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Chip
        label={count}
        color={count > 0 ? 'primary' : 'default'}
        size="small"
        sx={{ fontSize: '0.65rem', height: 20 }}
      />
    </Box>
  );

  const columns: GridColDef<EmployeeRow>[] = [
    { field: 'employeeName', headerName: 'Name', flex: 1, minWidth: 220 },
    {
      field: 'assignedAssetCount', headerName: 'Assigned Devices', width: 170,
      renderCell: ({ value }) => countCell(value as number),
    },
    {
      field: 'softwareCount', headerName: 'Software / Apps', width: 150,
      renderCell: ({ value }) => countCell(value as number),
    },
    {
      field: 'contractBadge', headerName: 'Contracts', width: 130,
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
      field: 'actions', headerName: 'Actions', width: 110, sortable: false, align: 'center', headerAlign: 'center',
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Manage End-User">
            <IconButton size="small" onClick={() => setDetailTarget(row)}>
              <EditNote sx={{ fontSize: 15 }} />
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

      {detailTarget && (
        <EmployeeDetailDialog
          employee={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </Box>
  );
}
