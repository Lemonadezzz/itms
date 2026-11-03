'use client';

import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, FormControlLabel, FormLabel, Grid, IconButton,
  Paper, Radio, RadioGroup, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { useState, useTransition } from 'react';
import { endContract } from '@/actions/contractActions';
import { getMonthlyDepreciationSchedule } from '@/lib/depreciation';
import { computeContractMetrics, formatTenure } from '@/lib/contracts';
import type { ContractRow } from '@/lib/data/contracts';

interface Props {
  contract: ContractRow;
  onClose: () => void;
  onEdit?: () => void;
  onUpdated?: (updated: ContractRow) => void;
}

const peso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-CA');
};

const formatMonth = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toISOString().slice(0, 7);
};

export function ContractDetailDialog({ contract, onClose, onEdit, onUpdated }: Props) {
  const isFullyPaid = contract.status === 'Fully Paid';
  const isActive = contract.contractStatus === 'Active';
  const isEnded = contract.contractStatus === 'Ended';
  const hasSchedule = !!contract.depreciationMethod && !!contract.acquisitionDate;

  const [endOpen, setEndOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [disposition, setDisposition] = useState<'decommission' | 'return'>('decommission');
  const [endError, setEndError] = useState('');
  const [isEnding, startEnding] = useTransition();

  function openEndDialog() {
    setReason('');
    setDisposition('decommission');
    setEndError('');
    setEndOpen(true);
  }

  function handleEndContract() {
    const trimmed = reason.trim();
    if (!trimmed) return setEndError('Please provide a reason for ending the contract.');

    const snapshot = contract;
    const endedAtDate = new Date();
    const endedAt = endedAtDate.toISOString();
    const metrics = computeContractMetrics({
      issuedDate: snapshot.issuedDate,
      numberOfMonths: snapshot.numberOfMonths,
      perCutoff: snapshot.perCutoff,
      totalContribution: snapshot.totalContribution,
      referenceDate: endedAtDate,
    });

    // Optimistically freeze the contract at the moment it ended.
    onUpdated?.({
      ...snapshot,
      endedAt,
      endReason: trimmed,
      contractEnd: endedAt,
      contractStatus: 'Ended',
      tenure: formatTenure(snapshot.issuedDate, endedAtDate),
      totalPaid: metrics.totalPaid,
      remaining: metrics.remaining,
      status: metrics.status,
    });
    setEndOpen(false);

    startEnding(async () => {
      const res = await endContract(snapshot._id, trimmed, disposition);
      if (!res.success) {
        onUpdated?.(snapshot);
        setEndError(res.error);
        setEndOpen(true);
      }
    });
  }

  const schedule = hasSchedule
    ? getMonthlyDepreciationSchedule(
        contract.acquisitionCost,
        contract.acquisitionDate,
        contract.depreciationMethod,
        contract.issuedDate
      )
    : [];

  return (
    <>
    <Dialog
      open
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          display: 'flex',
          flexDirection: 'column',
          width: hasSchedule ? '90vw' : '600px',
          minWidth: '600px',
          maxWidth: '1200px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem', fontWeight: 700 }}>
        Manage Contract: {contract.employeeName}
        <Button onClick={onClose} size="small" sx={{ minWidth: 0 }}><Close fontSize="small" /></Button>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'auto', p: 1, minWidth: 0 }}>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, md: hasSchedule ? 5 : 12 }}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Contract Information</Typography>
                  {isEnded && (
                    <Typography variant="caption" fontWeight={700} color="error.main">
                      Contract Ended: {formatMonth(contract.endedAt ?? contract.contractEnd)}
                    </Typography>
                  )}
                </Box>
                {onEdit && isActive && (
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={onEdit}>
                      <Edit sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Employee Name" value={contract.employeeName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Employee Status"
                    value={
                      <Chip
                        label={contract.employeeStatus || 'Unknown'}
                        size="small"
                        color={contract.employeeStatus === 'Active' ? 'success' : 'default'}
                        sx={{ fontSize: '0.72rem', height: 22 }}
                      />
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Device Name"
                    value={
                      <>
                        {contract.assetName}
                        <Typography component="div" variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {contract.assetCode}
                        </Typography>
                      </>
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Issued Date" value={formatDate(contract.issuedDate)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Payment End" value={formatDate(contract.finishDate)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Payroll Deduction Status"
                    value={
                      <Chip
                        label={contract.status}
                        size="small"
                        color={isFullyPaid ? 'success' : 'warning'}
                        sx={{ fontSize: '0.72rem', height: 22 }}
                      />
                    }
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.5 }} />

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Laptop Cost" value={peso(contract.acquisitionCost)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Number of Months" value={String(contract.numberOfMonths)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Per Month" value={peso(contract.perMonth)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Per Cutoff" value={peso(contract.perCutoff)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Total Contribution" value={peso(contract.totalContribution)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Total Paid" value={peso(contract.totalPaid)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Remaining"
                    value={
                      <Typography component="span" variant="body2" fontWeight={700} color={contract.remaining > 0 ? 'primary' : 'success.main'}>
                        {peso(contract.remaining)}
                      </Typography>
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Deployment Tenure" value={contract.tenure} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Contract End" value={formatDate(contract.contractEnd)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow
                    label="Contract Status"
                    value={
                      <Chip
                        label={contract.contractStatus}
                        size="small"
                        color={contract.contractStatus === 'Active' ? 'success' : 'default'}
                        sx={{ fontSize: '0.72rem', height: 22 }}
                      />
                    }
                  />
                </Grid>
                {isEnded && contract.endReason && (
                  <Grid size={{ xs: 12 }}>
                    <InfoRow label="End Reason" value={contract.endReason} />
                  </Grid>
                )}
              </Grid>

              {isActive && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                  <Button size="small" variant="outlined" color="error" onClick={openEndDialog}>
                    End Contract
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>

          {hasSchedule && (
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                  Asset Value Schedule
                </Typography>
                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { px: 1, py: 0.5 } }}>
                    <TableHead>
                      <TableRow>
                        {['Month', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5'].map((h) => (
                          <TableCell key={h} align={h === 'Month' ? 'left' : 'right'}>
                            <Typography variant="caption" fontWeight={700}>{h}</Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schedule.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ bgcolor: row.isCurrent ? 'primary.light' : 'inherit' }}>
                            <Typography variant="caption" fontWeight={row.isCurrent ? 700 : 400}>
                              {row.month}{row.isCurrent ? '*' : ''}
                            </Typography>
                          </TableCell>
                          {([1, 2, 3, 4, 5] as const).map((year) => {
                            const isHighlighted = row.isCurrent && row.currentYear === year;
                            return (
                              <TableCell key={year} align="right"
                                sx={{ bgcolor: isHighlighted ? 'primary.light' : 'inherit' }}>
                                <Typography variant="caption" fontWeight={isHighlighted ? 700 : 400}>
                                  {peso(row[`year${year}` as keyof typeof row] as number)}
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
            </Grid>
          )}
        </Grid>
      </DialogContent>
    </Dialog>

    <Dialog
      open={endOpen}
      onClose={() => { if (!isEnding) setEndOpen(false); }}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        End Contract?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          This will end {contract.employeeName}&apos;s contract for{' '}
          {contract.assetCode} - {contract.assetName}. This cannot be undone.
        </Typography>

        <FormControl sx={{ mb: 1.5 }}>
          <FormLabel sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
            What happens to the device?
          </FormLabel>
          <RadioGroup
            row
            value={disposition}
            onChange={(e) => setDisposition(e.target.value as 'decommission' | 'return')}
          >
            <FormControlLabel
              value="decommission"
              control={<Radio size="small" />}
              label={<Typography variant="body2">Decommission Asset</Typography>}
            />
            <FormControlLabel
              value="return"
              control={<Radio size="small" />}
              label={<Typography variant="body2">Return to Stock</Typography>}
            />
          </RadioGroup>
          <Typography variant="caption" color="text.secondary">
            {disposition === 'return'
              ? 'The device will be returned to the company and become available for assignment again.'
              : 'The device will be decommissioned using the same reason.'}
          </Typography>
        </FormControl>

        {endError && <Alert severity="error" sx={{ mb: 1.5, py: 0 }}>{endError}</Alert>}
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={2}
          size="small"
          label="Reason"
          placeholder="e.g. Employee resigned early, device died unexpectedly"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isEnding}
          inputProps={{ maxLength: 500 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button size="small" onClick={() => setEndOpen(false)} disabled={isEnding}>No</Button>
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={handleEndContract}
          disabled={isEnding || !reason.trim()}
          startIcon={isEnding ? <CircularProgress size={12} color="inherit" /> : null}
        >
          Yes, End Contract
        </Button>
      </DialogActions>
    </Dialog>
    </>
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
