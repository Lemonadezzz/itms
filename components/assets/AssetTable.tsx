'use client';

import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { Chip, Box, IconButton, Tooltip } from '@mui/material';
import { AssignmentInd, AssignmentReturn, Edit, Delete } from '@mui/icons-material';
import type { AssetRow, PaginationParams } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  laptop:  '#F05340',
  desktop: '#4085F0',
  display: '#269066',
};

const AGE_CONFIG = [
  { max: 24,       label: 'New',      color: '#22c55e' },
  { max: 42,       label: 'Mid-life', color: '#eab308' },
  { max: 48,       label: 'Near EOL', color: '#f97316' },
  { max: Infinity, label: 'EOL',      color: '#ef4444' },
];

const getAge = (months: number) => AGE_CONFIG.find((c) => months <= c.max)!;

const phpFormat = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

interface AssetTableProps {
  rows: AssetRow[];
  rowCount: number;
  pagination: PaginationParams;
  onPaginationChange: (m: GridPaginationModel) => void;
  onSortChange: (m: GridSortModel) => void;
  onAssign?: (row: AssetRow) => void;
  onReturn?: (row: AssetRow) => void;
  onEdit?:   (row: AssetRow) => void;
  onDelete?: (row: AssetRow) => void;
  loading?: boolean;
}

export function AssetTable({
  rows, rowCount, pagination, onPaginationChange, onSortChange,
  onAssign, onReturn, onEdit, onDelete, loading,
}: AssetTableProps) {
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
      field: 'ageInMonths', headerName: 'Age', width: 130,
      renderCell: ({ value }) => {
        const cfg = getAge(value as number);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem' }}>{value}mo · {cfg.label}</span>
          </Box>
        );
      },
    },
    { field: 'location',       headerName: 'Location',    width: 100 },
    {
      field: 'acquisitionCost', headerName: 'Cost', width: 130,
      renderCell: ({ value }) => <span style={{ fontSize: '0.72rem' }}>{phpFormat(value as number)}</span>,
    },
    { field: 'assignedTo',     headerName: 'Assigned To', width: 140 },
    {
      field: 'isAssigned', headerName: 'Status', width: 90,
      renderCell: ({ value }) => (
        <Chip label={value ? 'Assigned' : 'Available'} size="small"
          color={value ? 'primary' : 'default'} sx={{ fontSize: '0.7rem', height: 20 }} />
      ),
    },
    {
      field: 'actions', headerName: '', width: 120, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex' }}>
          {!row.isAssigned && onAssign && (
            <Tooltip title="Assign">
              <IconButton size="small" onClick={() => onAssign(row)}>
                <AssignmentInd sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
          {row.isAssigned && onReturn && (
            <Tooltip title="Return">
              <IconButton size="small" onClick={() => onReturn(row)}>
                <AssignmentReturn sx={{ fontSize: 15 }} />
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
      rows={rows}
      columns={columns}
      getRowId={(r) => r._id}
      rowCount={rowCount}
      loading={loading}
      paginationMode="server"
      sortingMode="server"
      checkboxSelection
      pageSizeOptions={[50, 75, 100]}
      paginationModel={{ page: pagination.page, pageSize: pagination.pageSize }}
      onPaginationModelChange={onPaginationChange}
      onSortModelChange={onSortChange}
      sx={{ border: 0, '--DataGrid-rowBorderColor': 'transparent' }}
    />
  );
}
