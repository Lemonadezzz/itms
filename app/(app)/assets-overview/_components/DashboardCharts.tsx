'use client';

import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import type {
  AssetLifecycleStat,
  AssetStatusStat,
  AssetTypeStat,
  DashboardStats,
  WatchlistAsset,
} from '@/lib/data/dashboard';

const phpFormat = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);

const numberFormat = (value: number) => new Intl.NumberFormat('en-PH').format(value);

const phpCompact = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₱${Math.round(value / 1_000)}k`;
  return `₱${Math.round(value)}`;
};

const percent = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function ChartCard({
  title,
  subtitle,
  badge,
  children,
  minHeight = 380,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children: ReactNode;
  minHeight?: number;
}) {
  return (
    <Card sx={{ height: '100%', minHeight }}>
      <CardContent
        sx={{
          p: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          '&:last-child': { pb: 2 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          {badge}
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message = 'No data available.' }: { message?: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

function DonutCard({
  title,
  subtitle,
  badge,
  items,
  total,
  showCost = false,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  items: { label: string; value: number; color: string; cost?: number }[];
  total: number;
  showCost?: boolean;
}) {
  const visible = items.filter((item) => item.value > 0);

  return (
    <ChartCard title={title} subtitle={subtitle} badge={badge} minHeight={420}>
      {visible.length === 0 ? (
        <EmptyChart />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
          <Box sx={{ position: 'relative', width: '100%', height: 210 }}>
            <PieChart
              height={210}
              series={[
                {
                  data: visible.map((item, index) => ({
                    id: index,
                    value: item.value,
                    label: item.label,
                    color: item.color,
                  })),
                  innerRadius: 52,
                  outerRadius: 84,
                  paddingAngle: 2,
                  cornerRadius: 4,
                },
              ]}
              hideLegend
              margin={{ top: 4, bottom: 4, left: 4, right: 4 }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <Typography variant="h5" fontWeight={800} lineHeight={1}>
                {numberFormat(total)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                assets
              </Typography>
            </Box>
          </Box>

          <Stack spacing={1}>
            {visible.map((item) => (
              <Box
                key={item.label}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="caption" noWrap>
                    {item.label}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexShrink: 0 }}>
                  {showCost && (
                    <Typography variant="caption" color="text.secondary">
                      {phpFormat(item.cost ?? 0)}
                    </Typography>
                  )}
                  <Typography variant="caption" fontWeight={700}>
                    {numberFormat(item.value)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28, textAlign: 'right' }}>
                    {percent(item.value, total)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </ChartCard>
  );
}

function LifecycleCard({ stages, stats }: { stages: AssetLifecycleStat[]; stats: DashboardStats }) {
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <ChartCard
      title="Lifecycle Health"
      subtitle="Age-based refresh exposure across the fleet"
      badge={<Chip label={`${stats.riskCount} to refresh`} size="small" color="warning" sx={{ height: 22 }} />}
      minHeight={420}
    >
      {total === 0 ? (
        <EmptyChart />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              height: 12,
              borderRadius: 6,
              overflow: 'hidden',
              bgcolor: 'action.hover',
            }}
          >
            {stages
              .filter((stage) => stage.count > 0)
              .map((stage) => (
                <Box
                  key={stage.stage}
                  title={`${stage.stage}: ${stage.count} assets`}
                  sx={{ width: `${(stage.count / total) * 100}%`, bgcolor: stage.color }}
                />
              ))}
          </Box>

          <Stack spacing={1.25}>
            {stages.map((stage) => (
              <Box key={stage.stage}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: stage.color,
                      }}
                    />
                    <Typography variant="caption" fontWeight={600}>
                      {stage.stage}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                      {stage.count}
                    </Box>{' '}
                    · {phpFormat(stage.cost)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={total > 0 ? (stage.count / total) * 100 : 0}
                  sx={{
                    mt: 0.5,
                    height: 5,
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: stage.color, borderRadius: 3 },
                  }}
                />
              </Box>
            ))}
          </Stack>

          <Box
            sx={{
              mt: 'auto',
              p: 1.25,
              borderRadius: 1.25,
              bgcolor: 'action.hover',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Near-EOL / EOL exposure
            </Typography>
            <Typography variant="caption" fontWeight={700}>
              {numberFormat(stats.riskCount)} assets · {phpFormat(stats.riskCost)}
            </Typography>
          </Box>
        </Box>
      )}
    </ChartCard>
  );
}

function RefreshWatchlist({ assets }: { assets: WatchlistAsset[] }) {
  return (
    <ChartCard
      title="Refresh Watchlist"
      subtitle="Near-EOL and EOL hardware still in service"
      badge={<Chip label={`${assets.length} shown`} size="small" sx={{ height: 22 }} />}
      minHeight={400}
    >
      {assets.length === 0 ? (
        <EmptyChart message="No hardware is approaching end of life." />
      ) : (
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader sx={{ '& .MuiTableCell-root': { px: 1, py: 0.6 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Asset</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell align="right">Age</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell align="right">Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset._id} hover>
                  <TableCell>
                    <Typography variant="caption" fontWeight={600} display="block" noWrap>
                      {asset.assetName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace', fontSize: '0.66rem' }}
                    >
                      {asset.assetCode} · {capitalize(asset.assetType)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={asset.lifecycle}
                      size="small"
                      color={asset.lifecycle === 'EOL' ? 'error' : 'warning'}
                      sx={{ fontSize: '0.66rem', height: 20 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{asset.ageInMonths} mo</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" noWrap>
                      {asset.assignedTo || 'Unassigned'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{phpFormat(asset.acquisitionCost)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </ChartCard>
  );
}

function LocationCard({ stats }: { stats: DashboardStats }) {
  const max = Math.max(...stats.byLocation.map((location) => location.count), 1);

  return (
    <ChartCard
      title="Inventory by Location"
      subtitle="Where company hardware is deployed"
      minHeight={400}
    >
      {stats.byLocation.length === 0 ? (
        <EmptyChart />
      ) : (
        <Stack spacing={1.75} sx={{ flex: 1 }}>
          {stats.byLocation.map((location) => (
            <Box key={location.location}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" fontWeight={600}>
                  {location.location}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {location.count} asset{location.count === 1 ? '' : 's'}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(location.count / max) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': { bgcolor: '#4085F0', borderRadius: 3 },
                }}
              />
            </Box>
          ))}

          <Box
            sx={{
              mt: 'auto',
              p: 1.25,
              borderRadius: 1.25,
              bgcolor: 'action.hover',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Largest site
            </Typography>
            <Typography variant="caption" fontWeight={700}>
              {stats.byLocation[0]?.location} · {stats.byLocation[0]?.count} assets
            </Typography>
          </Box>
        </Stack>
      )}
    </ChartCard>
  );
}

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function ChartsSkeleton() {
  return (
    <Grid container spacing={2}>
      {[
        { xs: 12, md: 6, lg: 4 },
        { xs: 12, md: 6, lg: 4 },
        { xs: 12, lg: 4 },
        { xs: 12, lg: 7 },
        { xs: 12, lg: 5 },
      ].map((size, index) => (
        <Grid key={index} size={size}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Skeleton width="35%" height={22} />
              <Skeleton width="55%" height={16} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" height={index < 3 ? 320 : 300} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

export function DashboardCharts({ stats }: { stats: DashboardStats }) {
  // Charts are rendered after mount. This keeps SVG/Emotion style generation
  // out of the hydration pass, which otherwise causes a global-style mismatch
  // in the App Router.
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const statusTotal = stats.byStatus.reduce((sum, status) => sum + status.count, 0);
  const typeTotal = stats.byType.reduce((sum, type) => sum + type.count, 0);

  const statusItems: { label: string; value: number; color: string; cost?: number }[] =
    stats.byStatus.map((status: AssetStatusStat) => ({
      label: status.status,
      value: status.count,
      color: status.color,
      cost: status.cost,
    }));

  const typeItems: { label: string; value: number; color: string; cost?: number }[] =
    stats.byType.map((type: AssetTypeStat) => ({
      label: type.label,
      value: type.count,
      color: type.color,
      cost: type.cost,
    }));

  if (!mounted) return <ChartsSkeleton />;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <DonutCard
          title="Portfolio Status"
          subtitle="Where assets currently sit"
          badge={<Chip label={`${numberFormat(statusTotal)} total`} size="small" sx={{ height: 22 }} />}
          items={statusItems}
          total={statusTotal}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <DonutCard
          title="Hardware Mix"
          subtitle="Units and acquisition value by category"
          badge={<Chip label={`${numberFormat(typeTotal)} units`} size="small" sx={{ height: 22 }} />}
          items={typeItems}
          total={typeTotal}
          showCost
        />
      </Grid>

      <Grid size={{ xs: 12, lg: 4 }}>
        <LifecycleCard stages={stats.byLifecycle} stats={stats} />
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <ChartCard
          title="Acquisition Value by Department"
          subtitle="Capital tied up in each cost center"
          badge={
            <Chip
              label={phpFormat(stats.totalAcquisitionCost)}
              size="small"
              sx={{ height: 22, fontWeight: 700 }}
            />
          }
          minHeight={390}
        >
          {stats.byCostCenter.length === 0 ? (
            <EmptyChart />
          ) : (
            <BarChart
              height={310}
              layout="horizontal"
              yAxis={[
                {
                  scaleType: 'band',
                  data: stats.byCostCenter.map((row) => row.department),
                  tickLabelStyle: { fontSize: 9 },
                },
              ]}
              xAxis={[
                {
                  valueFormatter: (value: number) => phpCompact(value),
                  tickLabelStyle: { fontSize: 9 },
                  tickNumber: 4,
                },
              ]}
              series={[
                {
                  data: stats.byCostCenter.map((row) => row.cost),
                  label: 'Acquisition cost',
                  color: '#F05340',
                  valueFormatter: (value: number | null) => phpFormat(Number(value ?? 0)),
                },
              ]}
              margin={{ top: 8, bottom: 28, left: 112, right: 16 }}
              grid={{ vertical: true }}
              borderRadius={4}
              hideLegend
            />
          )}
        </ChartCard>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <ChartCard
          title="Acquisition Spend by Year"
          subtitle="When the current portfolio was purchased"
          minHeight={390}
        >
          {stats.byAcquisitionYear.length === 0 ? (
            <EmptyChart />
          ) : (
            <BarChart
              height={310}
              xAxis={[
                {
                  scaleType: 'band',
                  data: stats.byAcquisitionYear.map((row) => row.year),
                  tickLabelStyle: { fontSize: 10 },
                },
              ]}
              yAxis={[
                {
                  valueFormatter: (value: number) => phpCompact(value),
                  tickLabelStyle: { fontSize: 9 },
                },
              ]}
              series={[
                {
                  data: stats.byAcquisitionYear.map((row) => row.cost),
                  label: 'Acquisition spend',
                  color: '#eab308',
                  valueFormatter: (value: number | null) => phpFormat(Number(value ?? 0)),
                },
              ]}
              margin={{ top: 8, bottom: 30, left: 64, right: 12 }}
              grid={{ horizontal: true }}
              borderRadius={4}
              hideLegend
            />
          )}
        </ChartCard>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <RefreshWatchlist assets={stats.watchlist} />
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <LocationCard stats={stats} />
      </Grid>
    </Grid>
  );
}
