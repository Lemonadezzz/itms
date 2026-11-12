import { Box } from '@mui/material';
import { requireSignedIn } from '@/lib/access';
import {
  getMyTicketCounts,
  getMyTickets,
  getTicketFormOptions,
} from '@/lib/data/tickets';
import { MyTicketsShell } from './_components/MyTicketsShell';

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function MyTicketsPage({ searchParams }: Props) {
  const access = await requireSignedIn();
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize))
    ? Number(sp.pageSize)
    : 50) as 50 | 75 | 100;

  const [{ rows, total }, counts, options] = await Promise.all([
    getMyTickets({
      userId: access.userId,
      page,
      pageSize,
      search: sp.search,
      status: sp.status,
    }),
    getMyTicketCounts(access.userId),
    getTicketFormOptions(access.userId),
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <MyTicketsShell
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        counts={counts}
        options={options}
        currentUserId={access.userId}
        isTechnician={access.isTechnician}
      />
    </Box>
  );
}
