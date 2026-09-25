'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';

type ColorMode = 'light' | 'dark';
const ColorModeContext = createContext({ toggle: () => {}, mode: 'dark' as ColorMode });

export const useColorMode = () => useContext(ColorModeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use the same default on server and client to avoid hydration mismatch
  // Client will update after hydration based on localStorage
  const [mode, setMode] = useState<ColorMode>('dark');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem('colorMode') as ColorMode | null;
    if (stored) setMode(stored);
  }, []);

  const colorMode = useMemo(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next = prev === 'dark' ? 'light' : 'dark';
          localStorage.setItem('colorMode', next);
          return next;
        }),
    }),
    [mode]
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <div suppressHydrationWarning>{children}</div>
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
}
