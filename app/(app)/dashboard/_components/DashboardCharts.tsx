'use client';

import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';

interface Props {
  byLifecycle: { stage: string; count: number; color: string }[];
  byCostPerDepartment: { department: string; cost: number }[];
}

const phpFormat = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v);

export function DashboardCharts({ byLifecycle, byCostPerDepartment }: Props) {
  const pieData = byLifecycle.map((l, i) => ({
    id: i,
    value: l.count,
    label: l.stage,
    color: l.color,
  }));

  return (
    <Grid container spacing={2} sx={{ flex: 1 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: 360 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Asset Lifecycle
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0, mt: 1 }}>
              <PieChart
                series={[{ data: pieData, innerRadius: 50, paddingAngle: 2, cornerRadius: 4 }]}
                height={290}
                slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' } } as object }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: 360 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Asset Cost by Department
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0, mt: 1 }}>
              <BarChart
                yAxis={[{ scaleType: 'band', data: byCostPerDepartment.map((d) => d.department), tickLabelStyle: { fontSize: 10 } }]}
                xAxis={[{ valueFormatter: (v) => phpFormat(v as number), tickLabelStyle: { fontSize: 9 } }]}
                series={[{ data: byCostPerDepartment.map((d) => d.cost), color: '#F05340', label: 'Cost' }]}
                layout="horizontal"
                height={290}
                margin={{ top: 10, bottom: 30, left: 90, right: 20 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
