import { Box, Typography } from '@mui/material';
import { getSoftware } from '@/lib/data/software';
import { getSupplierOptions } from '@/lib/data/suppliers';
import { SoftwareShell } from './_components/SoftwareShell';

interface Props { searchParams: Promise<Record<string, string>>; }

export default async function SoftwarePage({ searchParams }: Props) {
  const sp       = await searchParams;
  const page     = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 50) as 50 | 75 | 100;

  const [{ rows, total }, suppliers] = await Promise.all([
    getSoftware({ page, pageSize, search: sp.search }),
    getSupplierOptions(),
  ]);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={2}>Software Licenses</Typography>
      <SoftwareShell rows={rows} total={total} page={page} pageSize={pageSize} suppliers={suppliers} />
    </Box>
  );
}
