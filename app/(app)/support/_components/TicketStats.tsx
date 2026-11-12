'use client';

import { Grid, Paper, Typography } from '@mui/material';
import type { TicketStatusCounts } from '@/lib/data/tickets';

const CARDS: {
  key: keyof TicketStatusCounts;
  label: string;
  color: string;
}[] = [
  { key: 'total', label: 'Total', color: '#64748b' },
  { key: 'Open', label: 'Open', color: '#ef4444' },
  { key: 'In Progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'Pending', label: 'Pending', color: '#f59e0b' },
  { key: 'Resolved', label: 'Resolved', color: '#22c55e' },
  { key: 'Closed', label: 'Closed', color: '#94a3b8' },
];

export function TicketStats({ counts }: { counts: TicketStatusCounts }) {
  return (
    <Grid container spacing={1.5}>
      {CARDS.map((card) => (
        <Grid key={card.key} size={{ xs: 6, sm: 4, md: 2 }}>
          <Paper
            variant="outlined"
            sx={{ px: 1.5, py: 1.25, borderLeft: `3px solid ${card.color}`, borderRadius: 1.5 }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>
              {card.label}
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.3 }}>
              {counts[card.key]}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
