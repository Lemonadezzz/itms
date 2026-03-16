import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Box } from '@mui/material';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </Box>
    </Box>
  );
}
