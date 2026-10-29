'use client';

import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle,
  Divider, Grid, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { getMonthlyDepreciationSchedule } from '@/lib/depreciation';
import type { ContractRow } from '@/lib/data/contracts';

interface Props {
  contract: ContractRow;
  onClose: () => void;
  onEdit?: () => void;
}

const peso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-CA');
};

/**
 * A device becomes eligible for a new contract once it is 3 years old
 * (counted from its acquisition date).
 */
function getEligibility(value: string): { eligible: boolean; months: number } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { eligible: false, months: 1 };

  const now = new Date();
  const thirdAnniversary = new Date(date.getFullYear() + 3, date.getMonth(), date.getDate());
  if (now >= thirdAnniversary) return { eligible: true, months: 0 };

  let months =
    (thirdAnniversary.getFullYear() - now.getFullYear()) * 12 +
    (thirdAnniversary.getMonth() - now.getMonth());
  if (thirdAnniversary.getDate() < now.getDate()) months -= 1;

  return { eligible: false, months: Math.max(1, months) };
}

export function ContractDetailDialog({ contract, onClose, onEdit }: Props) {
  const isFullyPaid = contract.status === 'Fully Paid';
  const hasSchedule = !!contract.depreciationMethod && !!contract.acquisitionDate;
  const eligibility = getEligibility(contract.acquisitionDate || contract.issuedDate);

  const schedule = hasSchedule
    ? getMonthlyDepreciationSchedule(
        contract.acquisitionCost,
        contract.acquisitionDate,
        contract.depreciationMethod,
        contract.issuedDate
      )
    : [];

  return (
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
                <Typography variant="subtitle1" fontWeight={700}>Contract Information</Typography>
                {onEdit && (
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
                  <InfoRow
                    label="Eligibility"
                    value={
                      <Typography component="span" variant="body2" fontWeight={700} color="info.main">
                        {eligibility.eligible
                          ? 'Eligible for New Contract'
                          : `Eligible in ${eligibility.months} month${eligibility.months === 1 ? '' : 's'}`}
                      </Typography>
                    }
                  />
                </Grid>
              </Grid>
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
