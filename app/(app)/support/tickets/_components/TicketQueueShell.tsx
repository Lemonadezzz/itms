'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Edit, Search, Visibility } from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { TicketDetailDialog } from '@/app/(app)/support/_components/TicketDetailDialog';
import { TicketFormDialog } from '@/app/(app)/support/_components/TicketFormDialog';
import { TicketStats } from '@/app/(app)/support/_components/TicketStats';
import { useCan } from '@/lib/useCan';
import { TICKET_STATUSES, TICKET_STATUS_COLORS, TICKET_TYPES } from '@/lib/support';
import type {
  TechnicianOption,
  TicketFormOptions,
  TicketRow,
  TicketStatusCounts,
} from '@/lib/data/tickets';

interface Props {
  rows: TicketRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
  counts: TicketStatusCounts;
  options: TicketFormOptions;
  currentUserId: string;
  isTechnician: boolean;
  filterCategories: string[];
  technicians: TechnicianOption[];
}

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

export function TicketQueueShell({
  rows,
  total,
  page,
  pageSize,
  counts,
  options,
  currentUserId,
  isTechnician,
  filterCategories,
  technicians,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const can = useCan();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TicketRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailTicket = detailId ? rows.find((row) => row._id === detailId) ?? null : null;

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => params.set(key, String(value)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const columns: GridColDef<TicketRow>[] = [
    { field: 'ticketNumber', headerName: 'Ticket #', width: 110 },
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 220 },
    { field: 'type', headerName: 'Type', width: 130 },
    { field: 'category', headerName: 'Category', width: 130 },
    { field: 'requestedForName', headerName: 'Requested For', width: 160 },
    {
      field: 'status',
      headerName: 'Status',
      width: 125,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip
            label={value as string}
            size="small"
            color={TICKET_STATUS_COLORS[value as keyof typeof TICKET_STATUS_COLORS] ?? 'default'}
            sx={{ fontSize: '0.68rem', height: 20 }}
          />
        </Box>
      ),
    },
    {
      field: 'assignedTechnicianName',
      headerName: 'Assigned To',
      width: 160,
      valueFormatter: (value: string | undefined) => value || 'Unassigned',
    },
    {
      field: 'submittedDate',
      headerName: 'Submitted',
      width: 120,
      renderCell: ({ value }) => formatDate(value as string),
    },
    {
      field: 'actions',
      headerName: '',
      width: 90,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => setDetailId(row._id)}>
              <Visibility sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          {can('tickets.manage') && row.status !== 'Closed' && (
            <Tooltip title="Edit ticket">
              <IconButton
                size="small"
                onClick={() => {
                  setEditing(row);
                  setDetailId(null);
                  setFormOpen(true);
                }}
              >
                <Edit sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Ticket Queue
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Every support request, assigned to the technician team.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          New Ticket
        </Button>
      </Stack>

      <TicketStats counts={counts} />

      <Stack direction="row" gap={1} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search subject, number, person…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(event) => pushParams({ search: event.target.value, page: 0 })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 260 }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={searchParams.get('status') ?? ''}
          onChange={(event) => pushParams({ status: event.target.value, page: 0 })}
          sx={{ width: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          {TICKET_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Type"
          value={searchParams.get('type') ?? ''}
          onChange={(event) => pushParams({ type: event.target.value, page: 0 })}
          sx={{ width: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          {TICKET_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Category"
          value={searchParams.get('category') ?? ''}
          onChange={(event) => pushParams({ category: event.target.value, page: 0 })}
          sx={{ width: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          {filterCategories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Assignee"
          value={searchParams.get('assignee') ?? ''}
          onChange={(event) => pushParams({ assignee: event.target.value, page: 0 })}
          sx={{ width: 170 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="unassigned">Unassigned</MenuItem>
          <MenuItem value="me">Assigned to me</MenuItem>
          {technicians.map((technician) => (
            <MenuItem key={technician._id} value={technician._id}>
              {technician.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 400,
          height: 'calc(100vh - 300px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
          onRowDoubleClick={({ id }) => setDetailId(String(id))}
          sx={{ border: 0, flex: 1 }}
        />
      </Box>

      {formOpen && (
        <TicketFormDialog
          open
          ticket={editing}
          options={options}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {detailTicket && (
        <TicketDetailDialog
          ticket={detailTicket}
          technicians={options.technicians}
          currentUserId={currentUserId}
          currentEmployeeId={options.currentUser.employeeId}
          canManage={can('tickets.manage')}
          isTechnician={isTechnician}
          canDelete={can('tickets.delete')}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditing(detailTicket);
            setDetailId(null);
            setFormOpen(true);
          }}
        />
      )}
    </Box>
  );
}
