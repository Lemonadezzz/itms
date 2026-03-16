import { Box, Typography } from '@mui/material';
import { getEmployees } from '@/lib/data/employees';
import { EmployeesShell } from './_components/EmployeesShell';

interface Props { searchParams: Promise<Record<string, string>>; }

export default async function EmployeesPage({ searchParams }: Props) {
  const sp       = await searchParams;
  const page     = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 50) as 50 | 75 | 100;

  const { rows, total } = await getEmployees({ page, pageSize, search: sp.search });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Employees</Typography>
      <EmployeesShell rows={rows} total={total} page={page} pageSize={pageSize} />
    </Box>
  );
}
