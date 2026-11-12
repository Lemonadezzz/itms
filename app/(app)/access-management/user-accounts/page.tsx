import { Box, Typography } from '@mui/material';
import { getAccounts } from '@/lib/data/accounts';
import { getRoles } from '@/lib/data/roles';
import { requirePageAccess } from '@/lib/access';
import { hasPermission, permissionKey } from '@/lib/permissions';
import { AccountsShell } from './_components/AccountsShell';

interface Props { searchParams: Promise<Record<string, string>>; }

export default async function UserAccountsPage({ searchParams }: Props) {
  const access = await requirePageAccess('access');
  const sp       = await searchParams;
  const page     = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 50) as 50 | 75 | 100;

  const [{ rows, total }, roles] = await Promise.all([
    getAccounts({ page, pageSize, search: sp.search }),
    getRoles(),
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>User Accounts</Typography>
      <AccountsShell
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        roles={roles}
        canManage={hasPermission(access.permissions, permissionKey('access', 'manage'))}
        isDeveloper={access.isDeveloper}
      />
    </Box>
  );
}
