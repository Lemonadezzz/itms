import { Box } from '@mui/material';
import { requirePageAccess } from '@/lib/access';
import { getSupportConfig } from '@/lib/data/supportConfig';
import { getTechnicians } from '@/lib/data/tickets';
import { ConfigurationShell } from './_components/ConfigurationShell';

export default async function SupportConfigurationPage() {
  await requirePageAccess('support', 'manage');

  const [config, technicians] = await Promise.all([getSupportConfig(), getTechnicians()]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <ConfigurationShell config={config} technicians={technicians} />
    </Box>
  );
}
