'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Box, Button, Stack, TextField, MenuItem,
  InputAdornment, IconButton, Tooltip, Chip,
} from '@mui/material';
import { Add, Search, Edit, Delete } from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { TicketFormDialog } from './TicketFormDialog';
import { deleteTicket, updateTicketStatus } from '@/actions/ticketActions';
import type { TicketRow } from '@/lib/data/tickets';

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  'Open':        'error',
  'In-Progress': 'warning',
  'Closed':      'success',
};

interface Props {
  rows: TicketRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
  employees: { _id: string; employeeName: string }[];
}

export function TicketsShell({ rows, total, page, pageSize, employees }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TicketRow | null>(null);

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => params.set(k, String(v)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<TicketRow>[] = [
    { field: 'ticketNumber',   headerName: 'Ticket #',    width: 110 },
    { field: 'subject',        headerName: 'Subject',     flex: 1, minWidth: 180 },
    { field: 'reportedByName', headerName: 'Reported By', width: 150 },
    {
      field: 'status', headerName: 'Status', width: 120,
      renderCell: ({ value, row }) => (
        <Chip
          label={value} size="small" color={STATUS_COLORS[value] ?? 'default'}
          sx={{ fontSize: '0.7rem', height: 20, cursor: 'pointer' }}
          onClick={() => {
            const next = value === 'Open' ? 'In-Progress' : value === 'In-Progress' ? 'Closed' : 'Open';
            startTransition(async () => { await updateTicketStatus(row._id, next as 'Open' | 'In-Progress' | 'Closed'); });
          }}
        />
      ),
    },
    {
      field: 'submittedDate', headerName: 'Submitted', width: 110,
      renderCell: ({ value }) => new Date(value).toLocaleDateString(),
    },
    {
      field: 'actions', headerName: '', width: 80, sortable: false,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => { setEditing(row); setDialogOpen(true); }}>
              <Edit sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error"
              onClick={() => confirm('Delete ticket?') && startTransition(async () => { await deleteTicket(row._id); })}>
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" gap={1}>
          <TextField
            size="small" placeholder="Search…"
            defaultValue={searchParams.get('search') ?? ''}
            onChange={(e) => pushParams({ search: e.target.value, page: 0 })}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment> }}
            sx={{ width: 200 }}
          />
          <TextField
            select size="small" label="Status"
            defaultValue={searchParams.get('status') ?? ''}
            onChange={(e) => pushParams({ status: e.target.value, page: 0 })}
            sx={{ width: 130 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="In-Progress">In-Progress</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </TextField>
        </Stack>
        <Button variant="contained" size="small" startIcon={<Add />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}>
          New Ticket
        </Button>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 400, height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={rows} columns={columns} getRowId={(r) => r._id}
          rowCount={total} paginationMode="server"
          pageSizeOptions={[50, 75, 100]}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m: GridPaginationModel) => pushParams({ page: m.page, pageSize: m.pageSize })}
          sx={{ border: 0, flex: 1 }}
        />
      </Box>

      <TicketFormDialog
        open={dialogOpen} ticket={editing} employees={employees}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
      />
    </Box>
  );
}
