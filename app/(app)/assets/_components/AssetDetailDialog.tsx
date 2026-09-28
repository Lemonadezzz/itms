'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Grid, Chip, Divider, Paper, Skeleton, MenuItem, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { Close, PublishedWithChanges, AssignmentTurnedIn, MoveDown, DesktopAccessDisabled } from '@mui/icons-material';
import { useMemo, useState, useTransition, useEffect } from 'react';
import {
  calculateCurrentValue,
  isFullyDepreciated,
  getMonthlyDepreciationSchedule,
} from '@/lib/depreciation';
import type { AssetRow, AssetLogEntry } from '@/types';
import { transferAsset, assignAsset, returnAsset, decommissionAsset, recommissionAsset } from '@/actions/assetActions';
import { AssignDialog } from './AssignDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const TYPE_COLORS: Record<string, string> = {
  laptop:  '#F05340',
  desktop: '#4085F0',
  display: '#269066',
};

const phpFormat = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

interface Props {
  asset: AssetRow;
  onClose: () => void;
  employees?: { _id: string; employeeName: string }[];
}

export function AssetDetailDialog({ asset, onClose, employees = [] }: Props) {
  const isCustom = asset.depreciationMethod === 'custom';
  const [, startTransition] = useTransition();
  
  // Optimistic update state
  const [status, setStatus] = useState(asset.status);
  const [isAssigned, setIsAssigned] = useState(asset.isAssigned);
  const [assignedTo, setAssignedTo] = useState(asset.assignedTo);
  const [assignmentHistory, setAssignmentHistory] = useState(asset.assignmentHistory);
  const [assetLog, setAssetLog] = useState<AssetLogEntry[]>([]);
  
  // Dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAction, setTransferAction] = useState<'transfer' | 'return' | null>(null);
  const [transferEmpId, setTransferEmpId] = useState('');
  const [dialogKey, setDialogKey] = useState(0);
  const [decommissionOpen, setDecommissionOpen] = useState(false);
  const [recommissionOpen, setRecommissionOpen] = useState(false);

  // Refresh data when opening dialog with new asset
  const [currentAsset, setCurrentAsset] = useState(asset);
  useEffect(() => {
    if (asset !== currentAsset) {
      setCurrentAsset(asset);
      setStatus(asset.status);
      setIsAssigned(asset.isAssigned);
      setAssignedTo(asset.assignedTo);
      setAssignmentHistory(asset.assignmentHistory);
    }
  }, [asset]);

  // Fetch asset log
  useEffect(() => {
    fetch(`/api/assets/${asset._id}/log`)
      .then((res) => res.json())
      .then(setAssetLog)
      .catch(() => setAssetLog([]));
  }, [asset._id]);

  // Get current assigned employee name (for filtering out from transfer list)
  // Note: assignmentHistory only contains employeeName, not employeeId
  const currentEmployeeName = assignmentHistory.length > 0 && !assignmentHistory[assignmentHistory.length - 1].returnedAt
    ? assignmentHistory[assignmentHistory.length - 1].employeeName
    : null;

  async function handleTransferSubmit() {
    if (!transferEmpId && transferAction === 'transfer') return;
    
    if (transferAction === 'return') {
      const returnerName = assignedTo ?? 'Unknown';
      // Optimistic update
      setStatus('In Stock');
      setIsAssigned(false);
      setAssignedTo(undefined);
      setAssetLog((prev) => [...prev, { date: new Date().toISOString(), action: 'Return', details: `${returnerName} > Returned` }]);

      // Call returnAsset for returning to inventory
      startTransition(async () => {
        await returnAsset(asset._id);
        setTransferOpen(false);
        setTransferAction(null);
        setTransferEmpId('');
        // Refresh assignment history after return
        setAssignmentHistory([]);
      });
    } else {
      // Transfer to new employee
      const emp = employees.find((e) => e._id === transferEmpId);
      const employeeName = emp?.employeeName ?? 'Unknown Employee';
      const transferrerName = assignedTo ?? 'Unknown';

      // Optimistic update
      setStatus('In Use');
      setIsAssigned(true);
      setAssignedTo(employeeName);
      setAssetLog((prev) => [...prev, { date: new Date().toISOString(), action: 'Transfer', details: `${transferrerName} > ${employeeName}` }]);

      const formData = {
        employeeId: transferEmpId,
        employeeName: employeeName,
        assignedAt: new Date().toISOString().split('T')[0],
        notes: '',
      };

      startTransition(async () => {
        await assignAsset(asset._id, formData);
        setTransferOpen(false);
        setTransferAction(null);
        setTransferEmpId('');
        // Refresh assignment history after transfer
        setAssignmentHistory([]);
      });
    }
  }

  const handleDecommission = () => setDecommissionOpen(true);

  const handleRecommission = () => setRecommissionOpen(true);

  const currentValue = useMemo(
    () => isCustom ? calculateCurrentValue(asset.acquisitionCost, asset.acquisitionDate) : null,
    [isCustom, asset.acquisitionCost, asset.acquisitionDate]
  );

  const fullyDepreciated = useMemo(
    () => isCustom ? isFullyDepreciated(asset.acquisitionCost, asset.acquisitionDate) : false,
    [isCustom, asset.acquisitionCost, asset.acquisitionDate]
  );

  const schedule = useMemo(
    () => isCustom ? getMonthlyDepreciationSchedule(asset.acquisitionCost, asset.acquisitionDate) : [],
    [isCustom, asset.acquisitionCost, asset.acquisitionDate]
  );

  const ACTION_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    'Asset created': 'default',
    'Assign': 'warning',
    'Return': 'info',
    'Transfer': 'info',
    'Decommission': 'error',
    'Recommission': 'success',
  };

  const AssetLogTable = ({ rows }: { rows: AssetLogEntry[] }) => (
    <TableContainer>
      <Table size="small" sx={{ width: '100%' }}>
        <TableHead>
          <TableRow>
            <TableCell><strong>Date</strong></TableCell>
            <TableCell><strong>Action</strong></TableCell>
            <TableCell><strong>Details/Notes</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((entry, i) => (
            <TableRow key={i}>
              <TableCell sx={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                {new Date(entry.date).toLocaleDateString('en-CA')}
              </TableCell>
              <TableCell>
                <Chip
                  label={entry.action}
                  size="small"
                  color={ACTION_COLORS[entry.action] ?? 'default'}
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              </TableCell>
              <TableCell sx={{ fontSize: '0.72rem' }}>{entry.details}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      {/* ── Main detail dialog ── */}
      <Dialog
        open
        onClose={() => { onClose(); }}
        maxWidth={false}
        PaperProps={{ sx: { display: 'flex', flexDirection: 'column', maxHeight: '90vh', width: 'auto', minWidth: 'auto' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 700 }}>
          Hardware Details — {asset.assetName}
          <Button onClick={onClose} size="small" sx={{ minWidth: 0 }}><Close fontSize="small" /></Button>
        </DialogTitle>

        <DialogContent sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          <Grid container spacing={1} sx={{ width: 'auto' }}>

            {/* ── LEFT PANEL ── */}
            <Grid size={{ xs: 12, md: isCustom ? 4 : 12 }}>
              <Paper sx={{ p: 2, height: '100%', minHeight: isCustom ? 500 : 'auto', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Device Information</Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <InfoRow label="Asset Name"  value={asset.assetName} />
                  <InfoRow label="Asset Code"  value={<span style={{ fontFamily: 'monospace' }}>{asset.assetCode}</span>} />
                  <InfoRow label="Type" value={
                    <Chip label={asset.assetType.charAt(0).toUpperCase() + asset.assetType.slice(1)}
                      size="small"
                      sx={{ bgcolor: TYPE_COLORS[asset.assetType] ?? '#888', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }} />
                  } />
                  <InfoRow label="Location"         value={asset.location} />
                  <InfoRow label="Acquisition Date" value={new Date(asset.acquisitionDate).toLocaleDateString('en-CA')} />
                  <InfoRow label="Status" value={
                    <Chip label={status || 'Unknown'} size="small"
                      color={
                        status === 'In Use' ? 'warning' :
                        status === 'In Stock' ? 'success' :
                        status === 'Decommissioned' ? 'error' :
                        status === 'Pending Delivery' ? 'info' :
                        'default'
                      } sx={{ fontSize: '0.75rem' }} />
                  } />
                  {isAssigned && <InfoRow label="Assigned To" value={assignedTo} />}
                  {asset.depreciationMethod && (
                    <InfoRow label="Depreciation" value={asset.depreciationMethod} />
                  )}

                  <Divider sx={{ my: 0.5 }} />

                  <InfoRow label="Acquisition Cost" value={phpFormat(asset.acquisitionCost)} />

                  {isCustom && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Current Value</Typography>
                      {currentValue === null ? (
                        <Skeleton width={120} height={24} />
                      ) : fullyDepreciated ? (
                        <Typography variant="body2" color="error" fontWeight={700}>Fully Depreciated</Typography>
                      ) : (
                        <>
                          <Typography variant="body2" color="primary" fontWeight={700}>
                            {phpFormat(currentValue)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({((currentValue / asset.acquisitionCost) * 100).toFixed(1)}% of acquisition cost)
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 'auto' }}>
                    {status === 'In Use' && (
                      <Button variant="outlined" size="small" color="info" startIcon={<MoveDown />} onClick={() => { setTransferOpen(true); setTransferAction(null); setTransferEmpId(''); }}>Transfer / Return</Button>
                    )}
                    {status === 'In Stock' && (
                      <>
                        <Button variant="outlined" size="small" color="warning" startIcon={<AssignmentTurnedIn />} onClick={() => setAssignOpen(true)}>Assign</Button>
                        <Button variant="outlined" size="small" color="error" startIcon={<DesktopAccessDisabled />} onClick={handleDecommission}>Decommission</Button>
                      </>
                    )}
                    {status === 'Decommissioned' && (
                      <Button variant="outlined" size="small" color="success" startIcon={<PublishedWithChanges />} onClick={handleRecommission}>Recommission</Button>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* ── RIGHT PANEL — only for custom depreciation ── */}
            {isCustom && (
              <Grid size={{ xs: 12, md: 8 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 500 }}>

                  {/* Depreciation Schedule */}
                  <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 300 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Depreciation Schedule</Typography>
                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Month', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map((h) => (
                              <TableCell key={h} align={h === 'Month' ? 'left' : 'right'}>
                                <strong>{h}</strong>
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {schedule.map((row, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ bgcolor: row.isCurrent ? 'primary.light' : 'inherit' }}>
                                <Typography variant="body2" fontWeight={row.isCurrent ? 700 : 400} sx={{ fontSize: '0.72rem' }}>
                                  {row.month}{row.isCurrent ? ' (Current)' : ''}
                                </Typography>
                              </TableCell>
                              {([1, 2, 3, 4, 5] as const).map((year) => {
                                const isHighlighted = row.isCurrent && row.currentYear === year;
                                return (
                                  <TableCell key={year} align="right"
                                    sx={{ bgcolor: isHighlighted ? 'primary.light' : 'inherit' }}>
                                    <Typography variant="body2" fontWeight={isHighlighted ? 700 : 400} sx={{ fontSize: '0.72rem' }}>
                                      {phpFormat(row[`year${year}` as keyof typeof row] as number)}
                                    </Typography>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>

                  {/* Asset Log (custom panel) */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Asset Log</Typography>
                    <AssetLogTable rows={assetLog} />
                  </Paper>
                </Box>
              </Grid>
            )}



            {/* Asset Log for non-custom (below left panel) */}
            {!isCustom && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Asset Log</Typography>
                  <AssetLogTable rows={assetLog} />
                </Paper>
              </Grid>
            )}

          </Grid>
        </DialogContent>
      </Dialog>

      {/* ── Assign sub-dialog ── */}
      {assignOpen && (
        <AssignDialog
          asset={asset}
          employees={employees}
          onClose={() => setAssignOpen(false)}
          onUpdate={(newStatus, newIsAssigned, newAssignedTo) => {
            setStatus(newStatus);
            setIsAssigned(newIsAssigned);
            setAssignedTo(newAssignedTo);
          }}
          onLogUpdate={(action, details) => {
            setAssetLog((prev) => [...prev, { date: new Date().toISOString(), action, details }]);
          }}
        />
      )}

      {/* ── Decommission confirmation dialog ── */}
      <ConfirmDialog
        open={decommissionOpen}
        title={`Decommission ${asset.assetCode}?`}
        message="This will soft-delete the asset and set its status to Decommissioned."
        confirmLabel="Decommission"
        requireText="Reason for decommission"
        requirePlaceholder="e.g. Damaged beyond repair, End of life, Lost"
        onConfirm={async (reason) => {
          const res = await decommissionAsset(asset._id, reason);
          if (res.success) {
            setStatus('Decommissioned');
            setAssetLog((prev) => [...prev, { date: new Date().toISOString(), action: 'Decommission', details: reason }]);
            setDecommissionOpen(false);
          }
          return res.success;
        }}
        onCancel={() => setDecommissionOpen(false)}
      />

      {/* ── Recommission confirmation dialog ── */}
      <ConfirmDialog
        open={recommissionOpen}
        title={`Recommission ${asset.assetCode}?`}
        message='This will set the asset status back to "In Stock".'
        confirmLabel="Recommission"
        confirmColor="success"
        onConfirm={async () => {
          const res = await recommissionAsset(asset._id);
          if (res.success) {
            setStatus('In Stock');
            setAssetLog((prev) => [...prev, { date: new Date().toISOString(), action: 'Recommission', details: 'Returned to service' }]);
            setRecommissionOpen(false);
          }
          return res.success;
        }}
        onCancel={() => setRecommissionOpen(false)}
      />

      {/* ── Transfer / Return sub-dialog ── */}
      <Dialog open={transferOpen} onClose={() => { setTransferOpen(false); setTransferAction(null); setTransferEmpId(''); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
          Transfer / Return Asset
          <Typography variant="caption" display="block" color="text.secondary">
            {asset.assetCode} — {asset.assetName}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant={transferAction === 'transfer' ? 'contained' : 'outlined'}
              size="small"
              color="info"
              onClick={() => { setTransferAction('transfer'); setTransferEmpId(''); }}
              sx={{ flex: 1 }}
            >
              Transfer
            </Button>
            <Button
              variant={transferAction === 'return' ? 'contained' : 'outlined'}
              size="small"
              color="error"
              onClick={() => { setTransferAction('return'); setTransferEmpId(''); }}
              sx={{ flex: 1 }}
            >
              Return
            </Button>
          </Box>

          {transferAction === 'return' && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                This will return the asset to inventory and set its status to "In Stock".
              </Typography>
              <Typography variant="subtitle2" fontWeight={600}>
                {asset.assignedTo || 'Currently assigned employee'}
              </Typography>
            </Box>
          )}

          {transferAction === 'transfer' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Select the employee to transfer this asset to. The current employee will be excluded from the list.
              </Typography>
              <TextField
                select
                label="Transfer To"
                size="small"
                fullWidth
                value={transferEmpId}
                onChange={(e) => setTransferEmpId(e.target.value)}
              >
                {employees.filter((e) => e.employeeName !== currentEmployeeName).map((e) => (
                  <MenuItem key={e._id} value={e._id}>{e.employeeName}</MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </DialogContent>
        {transferAction && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button size="small" onClick={() => { setTransferAction(null); setTransferEmpId(''); }}>Back</Button>
            <Button
              size="small"
              variant="contained"
              disabled={transferAction === 'transfer' && !transferEmpId}
              onClick={handleTransferSubmit}
            >
              Confirm {transferAction === 'transfer' ? 'Transfer' : 'Return'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography component="div" variant="caption" color="text.secondary">{label}</Typography>
      <Typography component="div" variant="body2" fontWeight={500}>{value ?? '—'}</Typography>
    </Box>
  );
}
