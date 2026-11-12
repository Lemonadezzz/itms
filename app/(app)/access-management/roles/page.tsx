import { Box, Typography } from '@mui/material';
import { getRoles } from '@/lib/data/roles';
import { requirePageAccess } from '@/lib/access';
import { hasPermission, permissionKey } from '@/lib/permissions';
import { RolesShell } from './_components/RolesShell';

interface Props { searchParams: Promise<Record<string, string>>; }

export default async function RolesPage({ searchParams }: Props) {
  const access = await requirePageAccess('access');
  const sp       = await searchParams;
  const page     = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 50) as 50 | 75 | 100;

  const search = (sp.search ?? '').toLowerCase();
  const roles = await getRoles();
  const filtered = search
    ? roles.filter((role) =>
        [role.name, role.description, role.key].some((value) => value.toLowerCase().includes(search))
      )
    : roles;
  const rows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Roles</Typography>
      <RolesShell
        rows={rows}
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        canManage={hasPermission(access.permissions, permissionKey('access', 'manage'))}
      />
    </Box>
  );
}
