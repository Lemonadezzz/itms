'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Tooltip, Divider,
} from '@mui/material';
import {
  Dashboard, Inventory, People, ConfirmationNumber,
  Computer, Business, Calculate, History,
  ChevronLeft, Menu, LightMode, DarkMode, Logout,
} from '@mui/icons-material';
import { useColorMode } from '@/theme/ThemeProvider';

const EXPANDED = 240;
const COLLAPSED = 60;

const navItems = [
  { text: 'Dashboard',  href: '/dashboard',  icon: <Dashboard /> },
  { text: 'Hardware',   href: '/assets',      icon: <Inventory /> },
  { text: 'Employees',  href: '/employees',   icon: <People /> },
  { text: 'Tickets',    href: '/tickets',     icon: <ConfirmationNumber /> },
  { text: 'Software',   href: '/software',    icon: <Computer /> },
  { text: 'Suppliers',  href: '/suppliers',   icon: <Business /> },
  { text: 'Calculator', href: '/calculator',  icon: <Calculate /> },
  { text: 'Logs',       href: '/logs',        icon: <History /> },
];

export function Sidebar() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const { toggle, mode } = useColorMode();
  const width = open ? EXPANDED : COLLAPSED;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          overflowX: 'hidden',
          transition: 'width 0.2s',
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-end' : 'center', p: 1 }}>
        <IconButton onClick={() => setOpen((v) => !v)} size="small">
          {open ? <ChevronLeft /> : <Menu />}
        </IconButton>
      </Box>

      <Divider />

      <List dense>
        {navItems.map(({ text, href, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Tooltip key={href} title={open ? '' : text} placement="right">
              <ListItemButton
                component={Link}
                href={href}
                selected={active}
                sx={{ minHeight: 44, px: open ? 2 : 1.5, justifyContent: open ? 'initial' : 'center' }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', color: active ? 'primary.main' : 'inherit' }}>
                  {icon}
                </ListItemIcon>
                {open && <ListItemText primary={text} primaryTypographyProps={{ fontSize: '0.8rem' }} />}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Box sx={{ mt: 'auto' }}>
        <Divider />
        <List dense>
          <Tooltip title={open ? '' : (mode === 'dark' ? 'Light Mode' : 'Dark Mode')} placement="right">
            <ListItemButton onClick={toggle} sx={{ justifyContent: open ? 'initial' : 'center', px: open ? 2 : 1.5 }}>
              <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto' }}>
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </ListItemIcon>
              {open && <ListItemText primary={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} primaryTypographyProps={{ fontSize: '0.8rem' }} />}
            </ListItemButton>
          </Tooltip>
          <Tooltip title={open ? '' : 'Logout'} placement="right">
            <ListItemButton component={Link} href="/api/auth/signout" sx={{ justifyContent: open ? 'initial' : 'center', px: open ? 2 : 1.5 }}>
              <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto' }}>
                <Logout />
              </ListItemIcon>
              {open && <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.8rem' }} />}
            </ListItemButton>
          </Tooltip>
        </List>
      </Box>
    </Drawer>
  );
}
