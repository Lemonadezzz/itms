import { Box, Typography } from '@mui/material';
import { getAssets } from '@/lib/data/assets';
import { getEmployeeOptions } from '@/lib/data/employees';
import { AssetsShell } from './_components/AssetsShell';

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function AssetsPage({ searchParams }: Props) {
  const sp = await searchParams;

  const page     = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 50) as 50 | 75 | 100;
  const sortField = sp.sortField ?? 'createdAt';
  const sortDir   = sp.sortDir   ?? 'desc';

  const [{ rows, total }, employees] = await Promise.all([
    getAssets({ page, pageSize, sortField, sortDir, filters: {
      search:       sp.search,
      assetType:    sp.assetType,
      isAssigned:   sp.isAssigned,
      location:     sp.location,
      assignedToId: sp.assignedToId,
    }}),
    getEmployeeOptions(),
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Hardware Assets</Typography>
      <AssetsShell
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          sortField={sortField}
          sortDir={sortDir}
          employees={employees}
        />
    </Box>
  );
}
