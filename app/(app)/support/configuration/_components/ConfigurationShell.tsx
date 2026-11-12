'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, SupportAgent } from '@mui/icons-material';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CategoryDialog, type CategoryKind } from './CategoryDialog';
import {
  removeKnowledgeCategory,
  removeTicketCategory,
  upsertKnowledgeCategory,
  upsertTicketCategory,
} from '@/actions/supportConfigActions';
import type {
  KnowledgeCategory,
  SupportConfigData,
  TicketCategory,
} from '@/lib/data/supportConfig';
import type { TechnicianOption } from '@/lib/data/tickets';

interface Props {
  config: SupportConfigData;
  technicians: TechnicianOption[];
}

type DeleteTarget = { kind: CategoryKind; category: TicketCategory | KnowledgeCategory };

const ROLE_LABEL: Record<string, string> = {
  developer: 'Developer',
  super_admin: 'Super Admin',
};

export function ConfigurationShell({ config, technicians }: Props) {
  const router = useRouter();

  const [tab, setTab] = useState(0);
  const [dialog, setDialog] = useState<{ kind: CategoryKind; category: TicketCategory | KnowledgeCategory | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  function toggleCategory(kind: CategoryKind, category: TicketCategory | KnowledgeCategory) {
    const nextActive = !category.active;
    void (async () => {
      const result =
        kind === 'ticket'
          ? await upsertTicketCategory({
              key: category.key,
              label: category.label,
              appliesTo: (category as TicketCategory).appliesTo,
              active: nextActive,
            })
          : await upsertKnowledgeCategory({
              key: category.key,
              label: category.label,
              active: nextActive,
            });

      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    })();
  }

  const dialogTitle = tab === 0 ? 'ticket category' : 'knowledge category';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Support Configuration
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Manage ticket categories, knowledge categories, and the technician roster.
          </Typography>
        </Box>
        {tab !== 2 && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={() =>
              setDialog({ kind: tab === 0 ? 'ticket' : 'knowledge', category: null })
            }
          >
            Add {tab === 0 ? 'Ticket' : 'Knowledge'} Category
          </Button>
        )}
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ minHeight: 40, px: 1 }}>
          <Tab label="Ticket Categories" sx={{ minHeight: 40, fontSize: '0.78rem', textTransform: 'none' }} />
          <Tab label="Knowledge Categories" sx={{ minHeight: 40, fontSize: '0.78rem', textTransform: 'none' }} />
          <Tab label="Technicians" sx={{ minHeight: 40, fontSize: '0.78rem', textTransform: 'none' }} />
        </Tabs>

        {tab === 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Applies To</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {config.ticketCategories.map((category) => (
                  <TableRow key={category.key} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {category.label}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {category.key}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={category.appliesTo} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.66rem' }} />
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={category.active}
                        onChange={() => toggleCategory('ticket', category)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => setDialog({ kind: 'ticket', category })}
                        >
                          <Edit sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget({ kind: 'ticket', category })}
                        >
                          <Delete sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {config.ticketCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No ticket categories configured.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 1 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {config.knowledgeCategories.map((category) => (
                  <TableRow key={category.key} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {category.label}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {category.key}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="small"
                        checked={category.active}
                        onChange={() => toggleCategory('knowledge', category)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => setDialog({ kind: 'knowledge', category })}
                        >
                          <Edit sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget({ kind: 'knowledge', category })}
                        >
                          <Delete sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {config.knowledgeCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                        No knowledge categories configured.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
              Only Super Admins and Developers are technicians. Admins can configure support and view
              reports, but cannot be assigned tickets or resolve them.
            </Alert>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {technicians.map((technician) => (
                    <TableRow key={technician._id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <SupportAgent sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" fontWeight={600}>
                            {technician.name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{technician.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ROLE_LABEL[technician.roleKey] ?? technician.roleKey}
                          size="small"
                          color={technician.roleKey === 'developer' ? 'secondary' : 'primary'}
                          sx={{ height: 20, fontSize: '0.66rem' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {technicians.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                          No technician accounts found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {dialog && (
        <CategoryDialog
          open
          kind={dialog.kind}
          category={dialog.category}
          onClose={() => setDialog(null)}
          onSaved={() => {
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete “${deleteTarget?.category.label ?? ''}”?`}
        message={`Delete this ${dialogTitle}? Categories that are already in use cannot be deleted — deactivate them instead.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return false;
          const result =
            deleteTarget.kind === 'ticket'
              ? await removeTicketCategory(deleteTarget.category.key)
              : await removeKnowledgeCategory(deleteTarget.category.key);

          if (!result.success) {
            setError(result.error);
            return false;
          }

          setDeleteTarget(null);
          router.refresh();
          return true;
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
