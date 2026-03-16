import { Box, Typography } from '@mui/material';
import { getTickets } from '@/lib/data/tickets';
import { getEmployeeOptions } from '@/lib/data/employees';
import { TicketsShell } from './_components/TicketsShell';

interface Props { searchParams: Promise<Record<string, string>>; }

export default async function TicketsPage({ searchParams }: Props) {
  const sp       = await searchParams;
  const page     = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 50) as 50 | 75 | 100;

  const [{ rows, total }, employees] = await Promise.all([
    getTickets({ page, pageSize, search: sp.search, status: sp.status }),
    getEmployeeOptions(),
  ]);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Tickets</Typography>
      <TicketsShell rows={rows} total={total} page={page} pageSize={pageSize} employees={employees} />
    </Box>
  );
}
