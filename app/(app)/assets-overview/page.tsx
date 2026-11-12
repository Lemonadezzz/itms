import { Box, Paper, Typography } from '@mui/material';
import {
  AttachMoney,
  CheckCircle,
  Inventory,
  Payments,
  RadioButtonUnchecked,
  WarningAmber,
} from '@mui/icons-material';
import { getDashboardStats } from '@/lib/data/dashboard';
import { requirePageAccess } from '@/lib/access';
import { DashboardCharts } from './_components/DashboardCharts';

const phpFormat = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);

const numberFormat = (value: number) => new Intl.NumberFormat('en-PH').format(value);

export default async function AssetsOverviewPage() {
  await requirePageAccess('assets');
  const stats = await getDashboardStats();

  const kpis = [
    {
      label: 'Total Assets',
      value: numberFormat(stats.totalAssets),
      helper: `${stats.byType.filter((type) => type.count > 0).length} hardware categories`,
      icon: <Inventory />,
      color: '#F05340',
    },
    {
      label: 'Assigned',
      value: numberFormat(stats.assignedCount),
      helper: `${stats.utilizationRate.toFixed(0)}% of deployable units in use`,
      icon: <CheckCircle />,
      color: '#22c55e',
    },
    {
      label: 'Available',
      value: numberFormat(stats.availableCount),
      helper: `${stats.orderedCount} ordered · ${stats.retiredCount} retired`,
      icon: <RadioButtonUnchecked />,
      color: '#4085F0',
    },
    {
      label: 'Acquisition Value',
      value: phpFormat(stats.totalAcquisitionCost),
      helper: `Avg ${phpFormat(stats.averageCost)} per asset`,
      icon: <AttachMoney />,
      color: '#eab308',
    },
    {
      label: 'Estimated Book Value',
      value: phpFormat(stats.bookValue),
      helper: 'Residual value after depreciation',
      icon: <Payments />,
      color: '#8b5cf6',
    },
    {
      label: 'Refresh Risk',
      value: numberFormat(stats.riskCount),
      helper: `${phpFormat(stats.riskCost)} in near-EOL / EOL assets`,
      icon: <WarningAmber />,
      color: '#f97316',
    },
  ];

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: '100%',
        maxWidth: 1600,
        mx: 'auto',
      }}
    >
      <Box>
        <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
          Assets Overview
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Portfolio health, allocation, and spend across company hardware.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 1.5,
        }}
      >
        {kpis.map((kpi) => (
          <Paper
            key={kpi.label}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              p: 1.75,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: '0 auto 0 0',
                width: 3,
                bgcolor: kpi.color,
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {kpi.label}
                </Typography>
                <Typography variant="h6" fontWeight={800} lineHeight={1.2} noWrap>
                  {kpi.value}
                </Typography>
              </Box>
              <Box
                sx={{
                  color: kpi.color,
                  bgcolor: `${kpi.color}1f`,
                  borderRadius: 1.5,
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  '& svg': { fontSize: 19 },
                }}
              >
                {kpi.icon}
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap>
              {kpi.helper}
            </Typography>
          </Paper>
        ))}
      </Box>

      <DashboardCharts stats={stats} />
    </Box>
  );
}
