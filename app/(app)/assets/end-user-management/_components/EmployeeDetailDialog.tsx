'use client';

import {
  Alert, Box, Button, Chip, Dialog, DialogTitle, DialogContent,
  Divider, Grid, IconButton, List, ListItem, ListItemText, MenuItem,
  Paper, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, Close, Delete, Edit } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import {
  checkEmployeeAssets,
  checkEmployeeContracts,
  getEmployeeSoftware,
  assignSoftwareToEmployee,
  removeSoftwareFromEmployee,
} from '@/actions/employeeActions';
import type { EmployeeSoftwareItem } from '@/actions/employeeActions';
import { EMPLOYEE_CONTRACT_BADGE_COLORS } from '@/lib/employeeBadges';
import { useCan } from '@/lib/useCan';
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
  title?: string;
  infoTitle?: string;
  showAssets?: boolean;
  showContracts?: boolean;
  showSoftware?: boolean;
}

export function EmployeeDetailDialog({
  employee,
  onClose,
  onEdit,
  title = 'Manage End-User',
  infoTitle = 'End-User Information',
  showAssets = true,
  showContracts = true,
  showSoftware = true,
}: Props) {
  const isInactive = employee.status === 'Inactive';
  const can = useCan();

  const [assets, setAssets] = useState<Array<{ _id: string; assetCode: string; assetName: string; status: string }>>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [contracts, setContracts] = useState<EmployeeContractSummary[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [software, setSoftware] = useState<EmployeeSoftwareItem[]>([]);
  const [softwareOptions, setSoftwareOptions] = useState<EmployeeSoftwareItem[]>([]);
  const [softwareLoading, setSoftwareLoading] = useState(true);
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [softwareSaving, setSoftwareSaving] = useState(false);
  const [softwareError, setSoftwareError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setAssetsLoading(true);
    setContractsLoading(true);
    setSoftwareLoading(true);
    Promise.allSettled([
      checkEmployeeAssets(employee._id),
      checkEmployeeContracts(employee._id),
      getEmployeeSoftware(employee._id),
    ]).then(([assetsRes, contractsRes, softwareRes]) => {
      if (cancelled) return;
      if (assetsRes.status === 'fulfilled' && assetsRes.value.success) {
        setAssets(assetsRes.value.data.assets);
      }
      if (contractsRes.status === 'fulfilled' && contractsRes.value.success) {
        setContracts(contractsRes.value.data);
      }
      if (softwareRes.status === 'fulfilled' && softwareRes.value.success) {
        setSoftware(softwareRes.value.data.assigned);
        setSoftwareOptions(softwareRes.value.data.options);
      }
      setAssetsLoading(false);
      setContractsLoading(false);
      setSoftwareLoading(false);
    });
    return () => { cancelled = true; };
  }, [employee._id]);

  const activeContracts = contracts.filter((c) => c.contractStatus === 'Active');
  const previousContracts = contracts.filter((c) => c.contractStatus === 'Ended');
  const availableSoftware = softwareOptions.filter(
    (option) => !software.some((item) => item._id === option._id)
  );

  async function handleAddSoftware() {
    if (!selectedSoftware) return;
    setSoftwareSaving(true);
    setSoftwareError('');
    const res = await assignSoftwareToEmployee(employee._id, selectedSoftware);
    setSoftwareSaving(false);
    if (!res.success) return setSoftwareError(res.error);
    const added = softwareOptions.find((option) => option._id === selectedSoftware);
    if (added) {
      setSoftware((prev) =>
        [...prev, added].sort((a, b) => a.softwareName.localeCompare(b.softwareName))
      );
    }
    setSelectedSoftware('');
  }

  async function handleRemoveSoftware(softwareId: string) {
    setSoftwareSaving(true);
    setSoftwareError('');
    const res = await removeSoftwareFromEmployee(employee._id, softwareId);
    setSoftwareSaving(false);
    if (!res.success) return setSoftwareError(res.error);
    setSoftware((prev) => prev.filter((item) => item._id !== softwareId));
  }

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column', maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 700 }}>
        {title}: {employee.employeeName}
        <Button onClick={onClose} size="small" sx={{ minWidth: 0 }}><Close fontSize="small" /></Button>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {/* Software / Apps currently used by this end-user */}
          {showSoftware && (
          <Grid size={{ xs: 12, md: 5 }} sx={{ order: 2 }}>
            <Paper
              sx={{
                p: 2,
                height: '100%',
                maxHeight: 'calc(90vh - 160px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>Software / Apps</Typography>
                <Chip
                  label={softwareLoading ? '…' : software.length}
                  size="small"
                  color={software.length > 0 ? 'primary' : 'default'}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              </Box>

              {softwareError && (
                <Alert severity="error" sx={{ mb: 1, py: 0 }} onClose={() => setSoftwareError('')}>
                  {softwareError}
                </Alert>
              )}

              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}>
                {softwareLoading ? (
                  <Typography variant="body2" color="text.secondary">Loading…</Typography>
                ) : software.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No software associated yet.</Typography>
                ) : (
                  <List dense disablePadding>
                    {software.map((item) => (
                      <ListItem
                        key={item._id}
                        disableGutters
                        sx={{
                          py: 0.25,
                          borderBottom: 1,
                          borderColor: 'divider',
                          '&:last-of-type': { borderBottom: 0 },
                        }}
                        secondaryAction={
                          can('employees.manage') ? (
                          <Tooltip title="Remove">
                            <span>
                              <IconButton
                                edge="end"
                                size="small"
                                color="error"
                                disabled={softwareSaving}
                                onClick={() => handleRemoveSoftware(item._id)}
                              >
                                <Delete sx={{ fontSize: 14 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          ) : undefined
                        }
                      >
                        <ListItemText
                          primary={item.softwareName}
                          secondary={`${item.category} · ${item.status}`}
                          primaryTypographyProps={{ fontWeight: 500, fontSize: '0.8rem' }}
                          secondaryTypographyProps={{ fontSize: '0.7rem' }}
                          sx={{ pr: 3 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              {can('employees.manage') && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexShrink: 0 }}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={selectedSoftware}
                  onChange={(e) => setSelectedSoftware(e.target.value)}
                  disabled={softwareSaving || availableSoftware.length === 0}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">
                    {availableSoftware.length === 0 ? 'No software available' : 'Select software…'}
                  </MenuItem>
                  {availableSoftware.map((option) => (
                    <MenuItem key={option._id} value={option._id}>
                      {option.softwareName}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  disabled={!selectedSoftware || softwareSaving}
                  onClick={handleAddSoftware}
                >
                  Add
                </Button>
              </Box>
              )}
            </Paper>
          </Grid>
          )}

          {/* End-user information */}
          <Grid size={{ xs: 12, md: showSoftware ? 7 : 12 }} sx={{ order: 1 }}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>{infoTitle}</Typography>
                {onEdit && can('employees.manage') && (
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

                {showAssets && (
                  <>
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
                  </>
                )}

                {showContracts && (
                  <>
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
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
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
