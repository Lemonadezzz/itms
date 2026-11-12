import { Box } from '@mui/material';
import { requirePageAccess } from '@/lib/access';
import { getReportsData } from '@/lib/data/reports';
import { getSupportConfig } from '@/lib/data/supportConfig';
import { TICKET_TYPES } from '@/lib/support';
import { ReportsShell } from './_components/ReportsShell';

interface Props {
  searchParams: Promise<Record<string, string>>;
}

function toInputDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function parseInputDate(value: string | undefined, fallback: Date, endOfDay = false): Date {
  if (!value) return fallback;
  const parsed = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function ReportsPage({ searchParams }: Props) {
  await requirePageAccess('reports');
  const sp = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = now;

  const fromDate = parseInputDate(sp.from, defaultFrom);
  const toDate = parseInputDate(sp.to, defaultTo, true);

  const [data, config] = await Promise.all([
    getReportsData({
      from: fromDate,
      to: toDate,
      type: sp.type,
      category: sp.category,
    }),
    getSupportConfig(),
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <ReportsShell
        data={data}
        from={toInputDate(fromDate)}
        to={toInputDate(toDate)}
        type={sp.type ?? ''}
        category={sp.category ?? ''}
        typeOptions={TICKET_TYPES}
        categoryOptions={config.ticketCategories.map((category) => category.label)}
      />
    </Box>
  );
}
