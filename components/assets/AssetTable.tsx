'use client';

import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { Chip, Box, IconButton, Tooltip, Button } from '@mui/material';
import { Edit, Delete, Visibility } from '@mui/icons-material';
import type { AssetRow, PaginationParams } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  laptop:  '#F05340',
  desktop: '#4085F0',
  display: '#269066',
};

const AGE_CONFIG = [
  { max: 24,       color: '#22c55e' },
  { max: 42,       color: '#eab308' },
  { max: 48,       color: '#f97316' },
  { max: Infinity, color: '#ef4444' },
];

const getAgeColor = (months: number) => {
  const match = AGE_CONFIG.find((c) => months <= c.max);
  return match ? match.color : '#888';
};

function formatAge(months: number): string {
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  const yrStr  = yrs > 0 ? `${yrs}yr${yrs > 1 ? 's' : ''}` : '';
  const moStr  = mos > 0 ? `${mos}mo${mos > 1 ? 's' : ''}` : '';
  return [yrStr, moStr].filter(Boolean).join(' ') || '0mos';
}

const phpFormat = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

interface AssetTableProps {
  rows: AssetRow[];
  rowCount: number;
  pagination: PaginationParams;
  onPaginationChange: (m: GridPaginationModel) => void;
  onSortChange: (m: GridSortModel) => void;
  onDetail?: (row: AssetRow) => void;
  onEdit?:   (row: AssetRow) => void;
  onDelete?: (row: AssetRow) => void;
  onConfirmDelivery?: (row: AssetRow) => void;
  loading?: boolean;
}

export function AssetTable({
  rows, rowCount, pagination, onPaginationChange, onSortChange,
  onDetail, onEdit, onDelete, onConfirmDelivery, loading,
}: AssetTableProps) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const columns: GridColDef<AssetRow>[] = [
    { field: 'assetCode', headerName: 'Code',     width: 100 },
    { field: 'assetName', headerName: 'Name',     width: 180, flex: 1 },
    {
      field: 'assetType', headerName: 'Type', width: 90,
      renderCell: ({ value }) => (
        <Chip label={value} size="small"
          sx={{ bgcolor: TYPE_COLORS[value] ?? '#888', color: '#fff', fontSize: '0.7rem', height: 20 }} />
      ),
    },
    {
      field: 'ageInMonths', headerName: 'Age', width: 110,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: getAgeColor(value as number), flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem' }}>{formatAge(value as number)}</span>
        </Box>
      ),
    },
    { field: 'location',       headerName: 'Location',    width: 100 },
    {
      field: 'acquisitionCost', headerName: 'Cost', width: 130,
      renderCell: ({ value }) => <span style={{ fontSize: '0.72rem' }}>{phpFormat(value as number)}</span>,
    },
    { field: 'assignedTo',     headerName: 'Assigned To', width: 140 },
    {
      field: 'status', headerName: 'Status', width: 120,
      renderCell: ({ value }) => {
        const status = value as string;
        let color: 'default' | 'success' | 'warning' | 'error' = 'default';
        if (status === 'In Use') color = 'warning';
        else if (status === 'In Stock' || status === 'Available') color = 'success';
        else if (status === 'Decommissioned') color = 'error';
        else if (status === 'Pending Delivery') color = 'info';
        
        return (
          <Chip label={status || 'Unknown'} size="small"
            color={color} sx={{ fontSize: '0.7rem', height: 20 }} />
        );
      },
    },
    {
      field: 'actions', headerName: '', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {onDetail && (
            <Tooltip title="See Details">
              <IconButton size="small" onClick={() => onDetail(row)}>
                <Visibility sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(row)}>
                <Edit sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          {row.status === 'Pending Delivery' && onConfirmDelivery && (
            <Button size="small" onClick={() => onConfirmDelivery(row)} sx={{ fontSize: '0.65rem', minWidth: 'auto', px: 1 }}>
              Confirm
            </Button>
          )}
          {onDelete && (
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                <Delete sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DataGrid
      rows={safeRows}
      columns={columns}
      getRowId={(r) => r._id}
      rowCount={rowCount}
      loading={loading}
      paginationMode="server"
      sortingMode="server"
      checkboxSelection
      onSelectionModelChange={() => {}}
      pageSizeOptions={[50, 75, 100]}
      paginationModel={{ page: pagination.page, pageSize: pagination.pageSize }}
      onPaginationModelChange={onPaginationChange}
      onSortModelChange={onSortChange}
      sx={{ border: 0, flex: 1 }}
    />
  );
}
