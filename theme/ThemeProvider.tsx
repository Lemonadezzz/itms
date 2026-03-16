'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';

type ColorMode = 'light' | 'dark';
const ColorModeContext = createContext({ toggle: () => {}, mode: 'dark' as ColorMode });

export const useColorMode = () => useContext(ColorModeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ColorMode>('dark');

  useEffect(() => {
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
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
}
