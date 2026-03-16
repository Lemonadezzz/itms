'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, Card, CardContent, TextField,
  Typography, Alert, CircularProgress,
} from '@mui/material';
import { Inventory } from '@mui/icons-material';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) return setError('Invalid email or password.');
    router.push('/dashboard');
  }

  return (
    <Card sx={{ width: 360, p: 1 }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Inventory sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={700}>ITMS</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Sign in to your account
          </Typography>

          {error && <Alert severity="error" sx={{ width: '100%', py: 0 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField name="email" label="Email" type="email" size="small" required fullWidth autoFocus />
            <TextField name="password" label="Password" type="password" size="small" required fullWidth />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
