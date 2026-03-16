import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#F05340' },
      background:
        mode === 'dark'
          ? { default: '#0f0f0f', paper: '#1a1a1a' }
          : { default: '#ffffff', paper: '#ffffff' },
    },
    typography: {
      fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 12,
    },
    components: {
      MuiDataGrid: {
        defaultProps: { density: 'compact' },
        styleOverrides: {
          root: { fontSize: '0.75rem', backgroundColor: 'transparent' },
          row: {
            minHeight: '36px !important',
            maxHeight: '36px !important',
            borderBottom: mode === 'dark'
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(0,0,0,0.08)',
          },
          cell: { borderBottom: 'none' },
          columnHeaders: {
            borderBottom: mode === 'dark'
              ? '2px solid rgba(255,255,255,0.12)'
              : '2px solid rgba(0,0,0,0.12)',
          },
        },
      },
    },
  });
