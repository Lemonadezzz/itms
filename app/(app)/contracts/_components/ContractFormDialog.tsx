'use client';

import { useState, useTransition } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, TextField, Typography,
} from '@mui/material';
import { createContract, updateContract } from '@/actions/contractActions';
import {
  computeContractMetrics,
  computePerCutoff,
  computePerMonth,
  computeTotalContribution,
  DEFAULT_CONTRACT_MONTHS,
  MAX_CONTRACT_CONTRIBUTION,
} from '@/lib/contracts';
import type { ContractRow, EligibleContractOption } from '@/lib/data/contracts';

interface Props {
  open: boolean;
  contract: ContractRow | null;
  initial: EligibleContractOption | null;
  onClose: () => void;
  onUpdate?: (updated: ContractRow) => void;
  onCreated?: () => void;
}

const peso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const formatDate = (value: string | Date) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-CA');
};

export function ContractFormDialog({ open, contract, initial, onClose, onUpdate, onCreated }: Props) {
  const isEdit = !!contract;
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [numberOfMonths, setNumberOfMonths] = useState(
    contract ? String(contract.numberOfMonths) : String(DEFAULT_CONTRACT_MONTHS)
  );

  const employeeName   = contract?.employeeName   ?? initial?.employeeName   ?? '';
  const employeeStatus = contract?.employeeStatus ?? initial?.employeeStatus ?? '';
  const assetName      = contract?.assetName      ?? initial?.assetName      ?? '';
  const assetCode      = contract?.assetCode      ?? initial?.assetCode      ?? '';
  const acquisitionCost = contract?.acquisitionCost ?? initial?.acquisitionCost ?? 0;
  const issuedDate     = contract?.issuedDate     ?? initial?.issuedDate     ?? '';

  const monthsNum = Number(numberOfMonths) || 0;
  // Derived from the laptop cost: 30%, capped at ₱30,000.
  const totalNum = computeTotalContribution(acquisitionCost);
  const perMonthNum = computePerMonth(totalNum, monthsNum);
  const perCutoffNum = computePerCutoff(totalNum, monthsNum);

  const metrics = issuedDate && monthsNum >= 1
    ? computeContractMetrics({
        issuedDate,
        numberOfMonths: monthsNum,
        perCutoff: perCutoffNum,
        totalContribution: totalNum,
      })
    : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isEdit && !initial) return setError('Please select an employee and laptop.');

    startTransition(async () => {
      if (isEdit && contract) {
        const res = await updateContract(contract._id, { numberOfMonths: monthsNum });
        if (!res.success) return setError(res.error);
        if (onUpdate && metrics) {
          onUpdate({
            ...contract,
            numberOfMonths: monthsNum,
            perCutoff: perCutoffNum,
            perMonth: metrics.perMonth,
            totalContribution: totalNum,
            totalPaid: metrics.totalPaid,
            remaining: metrics.remaining,
            finishDate: metrics.finishDate.toISOString(),
            status: metrics.status,
          });
        }
      } else if (initial) {
        const res = await createContract({
          employeeId: initial.employeeId,
          assetId: initial.assetId,
          numberOfMonths: monthsNum,
        });
        if (!res.success) return setError(res.error);
        onCreated?.();
      }
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {isEdit ? 'Edit Contract' : 'New Contract'}
        <Typography variant="caption" display="block" color="text.secondary">
          {employeeName || 'Employee'} · {assetName || 'Laptop'}
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: '12px !important' }} suppressHydrationWarning>
          {error && <Alert severity="error" sx={{ mb: 2, py: 0 }}>{error}</Alert>}

          <Box sx={{ p: 1.5, mb: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
            <Grid container spacing={1}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryRow label="Name" value={employeeName || '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryRow
                  label="Employee Status"
                  value={
                    <Chip
                      label={employeeStatus || 'Unknown'}
                      size="small"
                      color={employeeStatus === 'Active' ? 'success' : 'default'}
                      sx={{ height: 20, fontSize: '0.68rem' }}
                    />
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryRow
                  label="Device Name"
                  value={assetName ? `${assetCode} - ${assetName}` : '-'}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryRow label="Issued Date" value={issuedDate ? formatDate(issuedDate) : '-'} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryRow label="Laptop Cost" value={peso(acquisitionCost)} />
              </Grid>
            </Grid>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Number of Months"
                type="number"
                size="small"
                required
                fullWidth
                inputProps={{ min: 1, step: 1 }}
                value={numberOfMonths}
                onChange={(e) => setNumberOfMonths(e.target.value)}
                helperText={`Default: ${DEFAULT_CONTRACT_MONTHS} months`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Total Contribution"
                size="small"
                fullWidth
                disabled
                value={peso(totalNum)}
                helperText={`30% of laptop cost, max ${peso(MAX_CONTRACT_CONTRIBUTION)}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Per Month"
                size="small"
                fullWidth
                disabled
                value={peso(perMonthNum)}
                helperText="Total Contribution ÷ Months"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Per Cutoff"
                size="small"
                fullWidth
                disabled
                value={peso(perCutoffNum)}
                helperText="Per Month ÷ 2"
              />
            </Grid>
          </Grid>

          {metrics && (
            <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Computed
              </Typography>
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SummaryRow label="Total Paid" value={peso(metrics.totalPaid)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SummaryRow label="Remaining" value={peso(metrics.remaining)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SummaryRow label="Payment End" value={formatDate(metrics.finishDate)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <SummaryRow
                    label="Payroll Deduction Status"
                    value={
                      <Chip
                        label={metrics.status}
                        size="small"
                        color={metrics.status === 'Fully Paid' ? 'success' : 'warning'}
                        sx={{ height: 20, fontSize: '0.68rem' }}
                      />
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isPending || (!isEdit && !initial)}
            startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}
          >
            {isEdit ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography component="div" variant="caption" color="text.secondary">{label}</Typography>
      <Typography component="div" variant="body2" fontWeight={600}>{value ?? '-'}</Typography>
    </Box>
  );
}
