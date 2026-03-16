'use client';

import { useState } from 'react';
import {
  Box, Button, Card, CardContent, Grid, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';

type Method = 'straight-line' | 'declining-balance';

type ScheduleRow = {
  year: number;
  openingValue: number;
  depreciation: number;
  closingValue: number;
};

const phpFormat = (v: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

function calcSchedule(cost: number, salvage: number, life: number, method: Method): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let book = cost;
  for (let y = 1; y <= life; y++) {
    const opening = book;
    let dep: number;
    if (method === 'straight-line') {
      dep = (cost - salvage) / life;
    } else {
      const rate = 1 - Math.pow(salvage / cost, 1 / life);
      dep = book * rate;
    }
    dep = Math.min(dep, book - salvage);
    book = opening - dep;
    rows.push({ year: y, openingValue: opening, depreciation: dep, closingValue: book });
  }
  return rows;
}

export default function CalculatorPage() {
  const [cost,     setCost]     = useState('');
  const [salvage,  setSalvage]  = useState('0');
  const [life,     setLife]     = useState('4');
  const [method,   setMethod]   = useState<Method>('straight-line');
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);

  function calculate() {
    const c = parseFloat(cost);
    const s = parseFloat(salvage);
    const l = parseInt(life);
    if (!c || !l || c <= 0 || l <= 0) return;
    setSchedule(calcSchedule(c, s || 0, l, method));
  }

  const totalDep = schedule.reduce((sum, r) => sum + r.depreciation, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, overflow: 'auto' }}>
      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Depreciation Calculator</Typography>

      <Card sx={{ mb: 2, flexShrink: 0 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Asset Cost (PHP)" size="small" fullWidth type="number"
                value={cost} onChange={(e) => setCost(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Salvage Value (PHP)" size="small" fullWidth type="number"
                value={salvage} onChange={(e) => setSalvage(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField label="Useful Life (yrs)" size="small" fullWidth type="number"
                value={life} onChange={(e) => setLife(e.target.value)}
                inputProps={{ min: 1, max: 20 }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Method" size="small" select fullWidth
                value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                <MenuItem value="straight-line">Straight-Line</MenuItem>
                <MenuItem value="declining-balance">Declining Balance</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 1 }}>
              <Button variant="contained" size="small" fullWidth onClick={calculate}>
                Calc
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {schedule.length > 0 && (
        <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: '12px !important' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Year', 'Opening Value', 'Depreciation', 'Closing Value'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {schedule.map((r) => (
                  <TableRow key={r.year} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{r.year}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{phpFormat(r.openingValue)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'error.main' }}>
                      ({phpFormat(r.depreciation)})
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{phpFormat(r.closingValue)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total Depreciation</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'error.main' }}>
                    ({phpFormat(totalDep)})
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
