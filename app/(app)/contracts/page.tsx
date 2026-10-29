import { Box, Typography } from '@mui/material';
import { getContracts } from '@/lib/data/contracts';
import { ContractsShell } from './_components/ContractsShell';

interface Props { searchParams: Promise<Record<string, string>>; }

export default async function ContractsPage({ searchParams }: Props) {
  const sp       = await searchParams;
  const page     = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 50) as 50 | 75 | 100;

  const { rows, total } = await getContracts({ page, pageSize, search: sp.search });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Contracts</Typography>
      <ContractsShell rows={rows} total={total} page={page} pageSize={pageSize} />
    </Box>
  );
}
