'use client';

import {
  Box, Button, Chip, Dialog, DialogTitle, DialogContent,
  Divider, IconButton, List, ListItem, ListItemText, Paper, Tooltip, Typography,
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { checkEmployeeAssets, checkEmployeeContracts } from '@/actions/employeeActions';
import { EMPLOYEE_CONTRACT_BADGE_COLORS } from '@/lib/employeeBadges';
import type { EmployeeRow } from '@/lib/data/employees';
import type { EmployeeContractSummary } from '@/lib/data/contracts';

const USER_TYPE_LABELS: Record<string, string> = {
  support: 'Support',
  standard: 'Standard',
  standardplus: 'Standard+',
  poweruser: 'Power User',
};

/** YYYY-MM */
function formatMonth(value: string): string {
  return value.slice(0, 7);
}

/** YYYY-MM-DD */
function formatDay(value: string): string {
  return value.slice(0, 10);
}

interface Props {
  employee: EmployeeRow;
  onClose: () => void;
  onEdit?: () => void;
}

export function EmployeeDetailDialog({ employee, onClose, onEdit }: Props) {
  const isInactive = employee.status === 'Inactive';

  const [assets, setAssets] = useState<Array<{ _id: string; assetCode: string; assetName: string; status: string }>>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [contracts, setContracts] = useState<EmployeeContractSummary[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAssetsLoading(true);
    setContractsLoading(true);
    Promise.allSettled([
      checkEmployeeAssets(employee._id),
      checkEmployeeContracts(employee._id),
    ]).then(([assetsRes, contractsRes]) => {
      if (cancelled) return;
      if (assetsRes.status === 'fulfilled' && assetsRes.value.success) {
        setAssets(assetsRes.value.data.assets);
      }
      if (contractsRes.status === 'fulfilled' && contractsRes.value.success) {
        setContracts(contractsRes.value.data);
      }
      setAssetsLoading(false);
      setContractsLoading(false);
    });
    return () => { cancelled = true; };
  }, [employee._id]);

  const activeContracts = contracts.filter((c) => c.contractStatus === 'Active');
  const previousContracts = contracts.filter((c) => c.contractStatus === 'Ended');

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
            <InfoRow label="Company Tenure" value={employee.companyTenure} />

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
                      sx={{
                        py: 0.25,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:last-of-type': { borderBottom: 0 },
                      }}
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

            <Divider sx={{ my: 0.5 }} />

            <Box>
              <Typography component="div" variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                Contracts
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={employee.contractBadge}
                  size="small"
                  color={EMPLOYEE_CONTRACT_BADGE_COLORS[employee.contractBadge]}
                  sx={{ fontSize: '0.72rem', height: 22 }}
                />
                {activeContracts.map((contract) => (
                  <Typography
                    key={contract._id}
                    variant="body2"
                    fontWeight={500}
                    sx={{ fontSize: '0.78rem' }}
                  >
                    {contract.assetCode} - {contract.assetName} - {formatDay(contract.issuedDate)} - {contract.tenureShort}
                  </Typography>
                ))}
              </Box>

              {contractsLoading ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Loading…
                </Typography>
              ) : previousContracts.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.75 }}>
                  {previousContracts.map((contract) => (
                    <Typography
                      key={contract._id}
                      variant="caption"
                      color="text.secondary"
                    >
                      {contract.assetName} - {formatMonth(contract.issuedDate)} - {formatMonth(contract.contractEnd)}
                    </Typography>
                  ))}
                </Box>
              ) : null}
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
