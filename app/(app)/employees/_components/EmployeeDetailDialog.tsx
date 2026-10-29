'use client';

import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent,
  Divider, IconButton, List, ListItem, ListItemText, Paper, Tooltip, Typography,
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { checkEmployeeAssets } from '@/actions/employeeActions';
import type { EmployeeRow } from '@/lib/data/employees';

const USER_TYPE_LABELS: Record<string, string> = {
  support: 'Support',
  standard: 'Standard',
  standardplus: 'Standard+',
  poweruser: 'Power User',
};

function monthsBetween(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (remainder > 0) parts.push(`${remainder} month${remainder > 1 ? 's' : ''}`);
  return parts.length ? parts.join(' ') : 'Less than a month';
}

interface Props {
  employee: EmployeeRow;
  onClose: () => void;
  onEdit?: () => void;
}

export function EmployeeDetailDialog({ employee, onClose, onEdit }: Props) {
  const isInactive = employee.status === 'Inactive';
  const hiredAt = employee.hiredAt ? new Date(employee.hiredAt) : null;
  const endDate = isInactive && employee.resignedAt ? new Date(employee.resignedAt) : new Date();
  const duration = hiredAt && !Number.isNaN(hiredAt.getTime())
    ? formatDuration(monthsBetween(hiredAt, endDate))
    : '-';

  const [assets, setAssets] = useState<Array<{ _id: string; assetCode: string; assetName: string; status: string }>>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAssetsLoading(true);
    checkEmployeeAssets(employee._id)
      .then((res) => {
        if (!cancelled && res.success) setAssets(res.data.assets);
      })
      .finally(() => {
        if (!cancelled) setAssetsLoading(false);
      });
    return () => { cancelled = true; };
  }, [employee._id]);

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column', maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 700 }}>
        Manage Employee: {employee.employeeName}
        <Button onClick={onClose} size="small" sx={{ minWidth: 0 }}><Close fontSize="small" /></Button>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Employee Information</Typography>
            {onEdit && (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={onEdit}>
                  <Edit sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <InfoRow label="Full Name" value={employee.employeeName} />
            <InfoRow label="Email" value={employee.email || '-'} />
            <InfoRow label="Department" value={employee.department} />
            <InfoRow label="User Type" value={USER_TYPE_LABELS[employee.userType] ?? employee.userType} />
            <InfoRow
              label="Employment Status"
              value={
                <Chip
                  label={employee.status || 'Unknown'}
                  size="small"
                  color={isInactive ? 'error' : 'success'}
                  sx={{ fontSize: '0.75rem' }}
                />
              }
            />
            <InfoRow
              label="Hire Date"
              value={employee.hiredAt ? new Date(employee.hiredAt).toLocaleDateString('en-CA') : '-'}
            />
            {isInactive && employee.resignedAt && (
              <InfoRow
                label="Resigned Date"
                value={new Date(employee.resignedAt).toLocaleDateString('en-CA')}
              />
            )}
            <InfoRow label="Duration in Company" value={duration} />

            <Divider sx={{ my: 0.5 }} />

            <Box>
              <Typography component="div" variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                Assigned Assets ({assetsLoading ? employee.assignedAssetCount ?? 0 : assets.length})
              </Typography>
              {assetsLoading ? (
                <Typography variant="body2" color="text.secondary">Loading…</Typography>
              ) : assets.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No assigned assets.</Typography>
              ) : (
                <List dense disablePadding>
                  {assets.map((asset) => (
                    <ListItem
                      key={asset._id}
                      disableGutters
                      sx={{ py: 0.25, borderBottom: 1, borderColor: 'divider' }}
                    >
                      <ListItemText
                        primary={asset.assetCode}
                        secondary={`${asset.assetName} · ${asset.status}`}
                        primaryTypographyProps={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8rem' }}
                        secondaryTypographyProps={{ fontSize: '0.72rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography component="div" variant="caption" color="text.secondary">{label}</Typography>
      <Typography component="div" variant="body2" fontWeight={500}>{value ?? '-'}</Typography>
    </Box>
  );
}
