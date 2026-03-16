import { Suspense } from 'react';
import { Box, Card, CardContent, CircularProgress, Grid, Typography } from '@mui/material';
import { Inventory, AttachMoney, CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { getDashboardStats } from '@/lib/data/dashboard';
import { DashboardCharts } from './_components/DashboardCharts';

const phpFormat = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v);

const statCards = (s: Awaited<ReturnType<typeof getDashboardStats>>) => [
  { label: 'Total Assets',  value: s.totalAssets,         icon: <Inventory />,            color: '#F05340' },
  { label: 'Assigned',      value: s.assignedCount,       icon: <CheckCircle />,          color: '#22c55e' },
  { label: 'Available',     value: s.availableCount,      icon: <RadioButtonUnchecked />, color: '#4085F0' },
  { label: 'Total Cost',    value: phpFormat(s.totalCost), icon: <AttachMoney />,         color: '#eab308' },
];

async function DashboardContent() {
  const stats = await getDashboardStats();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Grid container spacing={2}>
        {statCards(stats).map(({ label, value, icon, color }) => (
          <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
                <Box sx={{ color, display: 'flex' }}>{icon}</Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="h6" fontWeight={700} lineHeight={1.2}>{value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <DashboardCharts byType={stats.byType} byLifecycle={stats.byLifecycle} />
    </Box>
  );
}

export default function DashboardPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, overflow: 'auto' }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Dashboard</Typography>
      <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>}>
        <DashboardContent />
      </Suspense>
    </Box>
  );
}
