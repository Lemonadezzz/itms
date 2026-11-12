import { Box } from '@mui/material';
import { requireSignedIn } from '@/lib/access';
import { getMyDevices } from '@/lib/data/myDevices';
import { MyDevicesShell } from './_components/MyDevicesShell';

export default async function MyDevicesPage() {
  const access = await requireSignedIn();
  const data = await getMyDevices(access.userId);

  return (
    <Box sx={{ p: 2, maxWidth: 1400, width: '100%', mx: 'auto' }}>
      <MyDevicesShell {...data} />
    </Box>
  );
}
