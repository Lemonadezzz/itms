'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box, Button, Stack, Snackbar, Alert } from '@mui/material';
import { Add } from '@mui/icons-material';
import type { GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { AssetTable } from '@/components/assets/AssetTable';
import { AssetFiltersBar } from './AssetFiltersBar';
import { AssetFormDialog } from './AssetFormDialog';
import { AssetDetailDialog } from './AssetDetailDialog';
import { ConfirmDeliveryDialog } from './ConfirmDeliveryDialog';
import { deleteAsset } from '@/actions/assetActions';
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
  const [detailTarget, setDetailTarget] = useState<AssetRow | null>(null);
  const [confirmDeliveryTarget, setConfirmDeliveryTarget] = useState<AssetRow | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleDelete(row: AssetRow) {
    if (!confirm(`Delete ${row.assetCode}? This cannot be undone.`)) return;
    startTransition(async () => { await deleteAsset(row._id); });
  }

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

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
          onDetail={(row) => setDetailTarget(row)}
          onEdit={(row) => setEditTarget(row)}
          onDelete={handleDelete}
          onConfirmDelivery={(row) => setConfirmDeliveryTarget(row)}
        />
      </Box>

      {detailTarget && (
        <AssetDetailDialog
          asset={detailTarget}
          employees={employees}
          onClose={() => setDetailTarget(null)}
        />
      )}

      <AssetFormDialog
        open={createOpen || !!editTarget}
        asset={editTarget}
        onClose={() => { setCreateOpen(false); setEditTarget(null); }}
        onError={setErrorMsg}
      />

      {confirmDeliveryTarget && (
        <ConfirmDeliveryDialog
          asset={confirmDeliveryTarget}
          onClose={() => setConfirmDeliveryTarget(null)}
        />
      )}

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
