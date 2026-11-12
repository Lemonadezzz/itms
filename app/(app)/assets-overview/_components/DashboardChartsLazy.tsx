'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { DashboardCharts as DashboardChartsType } from './DashboardCharts';

const DashboardCharts = dynamic(
  () => import('./DashboardCharts').then(m => ({ default: m.DashboardCharts })),
  { ssr: false }
);

export function DashboardChartsLazy(props: ComponentProps<typeof DashboardChartsType>) {
  return <DashboardCharts {...props} />;
}
