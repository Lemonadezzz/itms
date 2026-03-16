'use client';

import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';

const TYPE_COLORS: Record<string, string> = {
  laptop: '#F05340',
  desktop: '#4085F0',
  display: '#269066',
};

interface Props {
  byType: { type: string; count: number }[];
  byLifecycle: { stage: string; count: number; color: string }[];
}

export function DashboardCharts({ byType, byLifecycle }: Props) {
  const pieData = byType.map((t, i) => ({
    id: i,
    value: t.count,
    label: t.type.charAt(0).toUpperCase() + t.type.slice(1),
    color: TYPE_COLORS[t.type] ?? '#888',
  }));

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Assets by Type
            </Typography>
            <Box sx={{ mt: 1 }}>
              <PieChart
                series={[{ data: pieData, innerRadius: 50, paddingAngle: 2, cornerRadius: 4 }]}
                height={220}
                slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' } } as object }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Assets by Lifecycle Stage
            </Typography>
            <Box sx={{ mt: 1 }}>
              <BarChart
                xAxis={[{ scaleType: 'band', data: byLifecycle.map((l) => l.stage) }]}
                series={[{
                  data: byLifecycle.map((l) => l.count),
                  color: '#F05340',
                  label: 'Assets',
                }]}
                height={220}
                margin={{ top: 10, bottom: 30, left: 30, right: 10 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
