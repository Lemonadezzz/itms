import { Box } from '@mui/material';
import { requirePageAccess } from '@/lib/access';
import {
  getTechnicians,
  getTicketFormOptions,
  getTicketQueue,
  getTicketQueueCounts,
} from '@/lib/data/tickets';
import { getSupportConfig } from '@/lib/data/supportConfig';
import { TicketQueueShell } from './_components/TicketQueueShell';

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function TicketsPage({ searchParams }: Props) {
  const access = await requirePageAccess('tickets');
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize))
    ? Number(sp.pageSize)
    : 50) as 50 | 75 | 100;

  const [{ rows, total }, counts, options, config, technicians] = await Promise.all([
    getTicketQueue({
      userId: access.userId,
      page,
      pageSize,
      search: sp.search,
      status: sp.status,
      type: sp.type,
      category: sp.category,
      assignee: sp.assignee,
    }),
    getTicketQueueCounts(),
    getTicketFormOptions(access.userId),
    getSupportConfig(),
    getTechnicians(),
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <TicketQueueShell
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        counts={counts}
        options={options}
        currentUserId={access.userId}
        isTechnician={access.isTechnician}
        filterCategories={config.ticketCategories.map((category) => category.label)}
        technicians={technicians}
      />
    </Box>
  );
}
