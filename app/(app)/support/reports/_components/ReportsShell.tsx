'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { formatDuration, TICKET_STATUS_COLORS } from '@/lib/support';
import type { ReportsData } from '@/lib/data/reports';

interface Props {
  data: ReportsData;
  from: string;
  to: string;
  type: string;
  category: string;
  typeOptions: readonly string[];
  categoryOptions: string[];
}

const monthLabel = (value: string) => {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const STATUS_COLORS: Record<string, string> = {
  Open: '#ef4444',
  'In Progress': '#3b82f6',
  Pending: '#f59e0b',
  Resolved: '#22c55e',
  Closed: '#94a3b8',
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.disabled">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ height: 360 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5 }}>
            {subtitle}
          </Typography>
        )}
        <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

export function ReportsShell({
  data,
  from,
  to,
  type,
  category,
  typeOptions,
  categoryOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function pushParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const trendLabels = data.monthlyTrends.map((item) => monthLabel(item.month));
  const categoryLabels = data.byCategory.map((item) => item.category);
  const categoryValues = data.byCategory.map((item) => item.count);
  const statusData = data.statusCounts.map((item, index) => ({
    id: index,
    value: item.count,
    label: item.status,
    color: STATUS_COLORS[item.status] ?? TICKET_STATUS_COLORS.Open,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 2 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          Reports & Analytics
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Support volume, resolution performance, and incident trends.
        </Typography>
      </Box>

      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
        <TextField
          label="From"
          type="date"
          size="small"
          value={from}
          onChange={(event) => pushParams({ from: event.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={to}
          onChange={(event) => pushParams({ to: event.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField
          select
          label="Type"
          size="small"
          value={type}
          onChange={(event) => pushParams({ type: event.target.value })}
          sx={{ width: 160 }}
        >
          <MenuItem value="">All types</MenuItem>
          {typeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Category"
          size="small"
          value={category}
          onChange={(event) => pushParams({ category: event.target.value })}
          sx={{ width: 170 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categoryOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Tickets This Month" value={String(data.totalThisMonth)} hint="Created this calendar month" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Tickets In Range" value={String(data.totalInRange)} hint="Created in the selected period" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Resolved In Range" value={String(data.resolvedInRange)} hint="Resolved or closed" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Avg. Resolution Time"
            value={data.averageResolutionMs > 0 ? formatDuration(data.averageResolutionMs) : '—'}
            hint="From creation to resolution"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard title="Monthly Ticket Trends" subtitle="Created vs resolved over the last 12 months">
            <LineChart
              height={280}
              xAxis={[{ scaleType: 'point', data: trendLabels }]}
              series={[
                { data: data.monthlyTrends.map((item) => item.created), label: 'Created', color: '#F05340' },
                { data: data.monthlyTrends.map((item) => item.resolved), label: 'Resolved', color: '#22c55e' },
              ]}
              margin={{ top: 16, bottom: 36, left: 44, right: 16 }}
            />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard title="Tickets by Status" subtitle="Within the selected period">
            {statusData.length > 0 ? (
              <PieChart
                height={280}
                series={[
                  {
                    data: statusData,
                    innerRadius: 45,
                    paddingAngle: 2,
                    cornerRadius: 4,
                  },
                ]}
                margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Tickets by Category" subtitle="Where requests come from">
            {categoryValues.length > 0 ? (
              <BarChart
                height={280}
                xAxis={[{ scaleType: 'band', data: categoryLabels }]}
                series={[{ data: categoryValues, label: 'Tickets', color: '#4085F0' }]}
                margin={{ top: 16, bottom: 48, left: 40, right: 16 }}
                borderRadius={4}
              />
            ) : (
              <EmptyChart />
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Incident Frequency" subtitle="Incidents reported per month">
            <BarChart
              height={280}
              xAxis={[{ scaleType: 'band', data: trendLabels }]}
              series={[
                {
                  data: data.incidentFrequency.map((item) => item.count),
                  label: 'Incidents',
                  color: '#f59e0b',
                },
              ]}
              margin={{ top: 16, bottom: 48, left: 40, right: 16 }}
              borderRadius={4}
            />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function EmptyChart() {
  return (
    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        No data for this period.
      </Typography>
    </Box>
  );
}
