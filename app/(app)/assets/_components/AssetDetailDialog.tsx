'use client';

import {
  Dialog, DialogTitle, DialogContent, Button,
  Box, Typography, Grid, Chip, Divider, Paper, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useMemo } from 'react';
import {
  calculateCurrentValue,
  isFullyDepreciated,
  getMonthlyDepreciationSchedule,
} from '@/lib/depreciation';
import type { AssetRow } from '@/types';

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
}

export function AssetDetailDialog({ asset, onClose }: Props) {
  const isCustom = asset.depreciationMethod === 'custom';

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

  return (
    <Dialog
      open
      onClose={onClose}
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
                  <Chip label={asset.isAssigned ? 'Assigned' : 'Available'}
                    color={asset.isAssigned ? 'warning' : 'success'} size="small" sx={{ fontSize: '0.75rem' }} />
                } />
                {asset.isAssigned && <InfoRow label="Assigned To" value={asset.assignedTo} />}
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

                {/* Assignment History */}
                {asset.assignmentHistory.length > 0 && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Assignment History</Typography>
                    <TableContainer>
                      <Table size="small" sx={{ width: '100%' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ width: '25%' }}><strong>Employee</strong></TableCell>
                            <TableCell sx={{ width: '20%' }}><strong>Assigned Date</strong></TableCell>
                            <TableCell sx={{ width: '20%' }}><strong>Returned Date</strong></TableCell>
                            <TableCell sx={{ width: '35%' }}><strong>Notes</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {asset.assignmentHistory.map((h, i) => (
                            <TableRow key={i}>
                              <TableCell sx={{ fontSize: '0.72rem' }}>{h.employeeName}</TableCell>
                              <TableCell sx={{ fontSize: '0.72rem' }}>{h.assignedDate.split('T')[0]}</TableCell>
                              <TableCell>
                                {h.returnedDate
                                  ? <span style={{ fontSize: '0.72rem' }}>{h.returnedDate.split('T')[0]}</span>
                                  : <Chip label="Currently Assigned" color="warning" size="small" sx={{ fontSize: '0.65rem' }} />}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.72rem' }}>{h.notes ?? '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                )}
              </Box>
            </Grid>
          )}

          {/* Assignment History for non-custom (below left panel) */}
          {!isCustom && asset.assignmentHistory.length > 0 && (
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Assignment History</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Employee</strong></TableCell>
                        <TableCell><strong>Assigned Date</strong></TableCell>
                        <TableCell><strong>Returned Date</strong></TableCell>
                        <TableCell><strong>Notes</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {asset.assignmentHistory.map((h, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ fontSize: '0.72rem' }}>{h.employeeName}</TableCell>
                          <TableCell sx={{ fontSize: '0.72rem' }}>{h.assignedDate.split('T')[0]}</TableCell>
                          <TableCell>
                            {h.returnedDate
                              ? <span style={{ fontSize: '0.72rem' }}>{h.returnedDate.split('T')[0]}</span>
                              : <Chip label="Currently Assigned" color="warning" size="small" sx={{ fontSize: '0.65rem' }} />}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.72rem' }}>{h.notes ?? '—'}</TableCell>
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
      <Typography component="div" variant="body2" fontWeight={500}>{value ?? '—'}</Typography>
    </Box>
  );
}
