import { Box, Typography } from '@mui/material';
import { getLogs } from '@/lib/data/logs';
import { requirePageAccess } from '@/lib/access';
import { LogsShell } from './_components/LogsShell';

interface Props { searchParams: Promise<Record<string, string>>; }

export default async function LogsPage({ searchParams }: Props) {
  await requirePageAccess('logs');
  const sp       = await searchParams;
  const page     = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 50) as 50 | 75 | 100;

  const { rows, total } = await getLogs({
    page,
    pageSize,
    search: sp.search,
    action: sp.action,
    models: ['Asset', 'Employee', 'Contract'],
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Logs</Typography>
      <LogsShell rows={rows} total={total} page={page} pageSize={pageSize} />
    </Box>
  );
}
