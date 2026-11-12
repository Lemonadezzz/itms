'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { getTheme } from './theme';

type ColorMode = 'light' | 'dark';
const ColorModeContext = createContext({ toggle: () => {}, mode: 'dark' as ColorMode });

export const useColorMode = () => useContext(ColorModeContext);

/**
 * Emotion cache that hoists generated styles into the server-rendered HTML.
 * Without this, MUI's global styles are emitted inline in <body>, which React
 * can mistake for a hydration mismatch in the App Router.
 *
 * In compat mode Emotion stores the fully serialized CSS (including selector
 * prefixes) in `cache.inserted[name]` on the server, so the hoisted <style>
 * tag must be built from that value rather than the raw `serialized.styles`.
 */
function useEmotionCache() {
  const [registry] = useState(() => {
    const cache = createCache({ key: 'css' });
    cache.compat = true;

    const prevInsert = cache.insert;
    let insertedNames: string[] = [];

    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        insertedNames.push(serialized.name);
      }
      return prevInsert(...args);
    };

    const flush = () => {
      const names = insertedNames;
      insertedNames = [];
      return names;
    };

    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const { cache, flush } = registry;
    const names = flush().filter((name) => typeof cache.inserted[name] === 'string');
    if (names.length === 0) return null;

    const styles = names.map((name) => cache.inserted[name]).join('\n');

    return (
      <style
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return registry.cache;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use the same default on server and client to avoid hydration mismatch.
  // The client updates after hydration based on localStorage.
  const [mode, setMode] = useState<ColorMode>('dark');
  const cache = useEmotionCache();

  useEffect(() => {
    const stored = localStorage.getItem('colorMode') as ColorMode | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the saved theme after hydration
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
      <CacheProvider value={cache}>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </CacheProvider>
    </ColorModeContext.Provider>
  );
}
