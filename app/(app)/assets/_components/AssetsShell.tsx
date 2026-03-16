'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Button, Stack } from '@mui/material';
import { Add } from '@mui/icons-material';
import type { GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { AssetTable } from '@/components/assets/AssetTable';
import { AssetFiltersBar } from './AssetFiltersBar';
import { AssetFormDialog } from './AssetFormDialog';
import { AssignDialog } from './AssignDialog';
import { returnAsset, deleteAsset } from '@/actions/assetActions';
import type { AssetRow } from '@/types';

interface Props {
  rows: AssetRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
  sortField: string;
  sortDir: string;
  employees: { _id: string; employeeName: string }[];
}

export function AssetsShell({ rows, total, page, pageSize, sortField, sortDir, employees }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<AssetRow | null>(null);
  const [assignTarget, setAssignTarget] = useState<AssetRow | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleReturn(row: AssetRow) {
    if (!confirm(`Return ${row.assetCode}?`)) return;
    startTransition(async () => { await returnAsset(row._id); });
  }

  function handleDelete(row: AssetRow) {
    if (!confirm(`Delete ${row.assetCode}? This cannot be undone.`)) return;
    startTransition(async () => { await deleteAsset(row._id); });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 1.5, minHeight: 0 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <AssetFiltersBar employees={employees} onFilter={(f) => pushParams({ ...f, page: 0 })} />
        <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
          Add Asset
        </Button>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <AssetTable
          rows={rows}
          rowCount={total}
          pagination={{ page, pageSize, sortField, sortDir: sortDir as 'asc' | 'desc' }}
          onPaginationChange={(m: GridPaginationModel) => pushParams({ page: m.page, pageSize: m.pageSize })}
          onSortChange={(m: GridSortModel) => { if (m[0]) pushParams({ sortField: m[0].field, sortDir: m[0].sort ?? 'asc', page: 0 }); }}
          onAssign={(row) => setAssignTarget(row)}
          onReturn={handleReturn}
          onEdit={(row) => setEditTarget(row)}
          onDelete={handleDelete}
        />
      </Box>

      <AssetFormDialog
        open={createOpen || !!editTarget}
        asset={editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null); }}
      />

      {assignTarget && (
        <AssignDialog
          asset={assignTarget}
          employees={employees}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </Box>
  );
}
