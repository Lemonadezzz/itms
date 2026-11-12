'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  calculateCurrentValue,
  getMonthlyDepreciationSchedule,
  type DepreciationMonthRow,
} from '@/lib/depreciation';

const peso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

type ValueScheduleProps = {
  acquisitionCost: number;
  acquisitionDate?: string;
  depreciationMethod?: string;
  assignedDate?: string;
};

type ScheduleState = {
  rows: DepreciationMonthRow[];
  currentValue: number;
};

// No-op subscription: the client snapshot flips from false (server/hydration)
// to true after mount, so live values are only computed in the browser.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Asset value schedule. Computed after mount so the live "current month"
 * highlight matches the browser clock (the server uses a fixed reference date
 * to keep server rendering deterministic).
 */
export function AssetValueSchedule({
  acquisitionCost,
  acquisitionDate,
  depreciationMethod,
  assignedDate,
}: ValueScheduleProps) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const hasSchedule = !!depreciationMethod && !!acquisitionDate;

  const data = useMemo<ScheduleState | null>(() => {
    if (!mounted || !depreciationMethod || !acquisitionDate) return null;
    return {
      rows: getMonthlyDepreciationSchedule(
        acquisitionCost,
        acquisitionDate,
        depreciationMethod,
        assignedDate
      ),
      currentValue: calculateCurrentValue(
        acquisitionCost,
        acquisitionDate,
        depreciationMethod,
        assignedDate
      ),
    };
  }, [mounted, acquisitionCost, acquisitionDate, depreciationMethod, assignedDate]);

  if (!hasSchedule) {
    return (
      <Typography variant="body2" color="text.secondary">
        No depreciation schedule is available for this device.
      </Typography>
    );
  }

  if (!data) {
    return <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1 }} />;
  }

  const fullyDepreciated = data.currentValue <= 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minHeight: 0 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Current Value
        </Typography>
        {fullyDepreciated ? (
          <Typography variant="body2" color="error" fontWeight={700}>
            Fully Depreciated
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="primary" fontWeight={700}>
              {peso(data.currentValue)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({((data.currentValue / acquisitionCost) * 100).toFixed(1)}% of acquisition cost)
            </Typography>
          </Box>
        )}
      </Box>

      <TableContainer sx={{ overflow: 'auto' }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { px: 0.75, py: 0.4 } }}>
          <TableHead>
            <TableRow>
              {['Month', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5'].map((header) => (
                <TableCell key={header} align={header === 'Month' ? 'left' : 'right'}>
                  <Typography variant="caption" fontWeight={700}>
                    {header}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell sx={{ bgcolor: row.isCurrent ? 'primary.light' : 'inherit' }}>
                  <Typography variant="caption" fontWeight={row.isCurrent ? 700 : 400}>
                    {row.month}
                    {row.isCurrent ? '*' : ''}
                  </Typography>
                </TableCell>
                {([1, 2, 3, 4, 5] as const).map((year) => {
                  const isHighlighted = row.isCurrent && row.currentYear === year;
                  return (
                    <TableCell
                      key={year}
                      align="right"
                      sx={{ bgcolor: isHighlighted ? 'primary.light' : 'inherit' }}
                    >
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
    </Box>
  );
}
