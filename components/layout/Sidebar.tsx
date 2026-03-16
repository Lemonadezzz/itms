'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Box, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Tooltip, Divider,
  Avatar, Typography,
} from '@mui/material';
import {
  Dashboard, Inventory, People, ConfirmationNumber,
  Computer, Business, Calculate, History,
  ChevronLeft, Menu, LightMode, DarkMode, Logout, Settings,
} from '@mui/icons-material';
import { useColorMode } from '@/theme/ThemeProvider';
import { ProfileDialog } from './ProfileDialog';

const EXPANDED  = 240;
const COLLAPSED = 60;
const ICON_COL  = 36;

const navItems = [
  { text: 'Dashboard',  href: '/dashboard',  icon: <Dashboard          fontSize="small" /> },
  { text: 'Hardware',   href: '/assets',      icon: <Inventory          fontSize="small" /> },
  { text: 'Employees',  href: '/employees',   icon: <People             fontSize="small" /> },
  { text: 'Tickets',    href: '/tickets',     icon: <ConfirmationNumber fontSize="small" /> },
  { text: 'Software',   href: '/software',    icon: <Computer           fontSize="small" /> },
  { text: 'Suppliers',  href: '/suppliers',   icon: <Business           fontSize="small" /> },
  { text: 'Calculator', href: '/calculator',  icon: <Calculate          fontSize="small" /> },
  { text: 'Logs',       href: '/logs',        icon: <History            fontSize="small" /> },
];

function avatarColor(name: string) {
  const colors = ['#F05340','#4085F0','#269066','#8b5cf6','#eab308','#f97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export function Sidebar() {
  const [open, setOpen]           = useState(true);
  const [profileOpen, setProfile] = useState(false);
  const pathname                  = usePathname();
  const { toggle, mode }          = useColorMode();
  const { data: session }         = useSession();
  const width                     = open ? EXPANDED : COLLAPSED;

  const userName  = session?.user?.name  ?? '—';
  const userEmail = session?.user?.email ?? '—';
  const bgColor   = avatarColor(userName);

  const itemSx = {
    minHeight: 40,
    px: 0,
    pl: `${(COLLAPSED - ICON_COL) / 2}px`,
    gap: 0,
  };

  const iconSx = (active = false) => ({
    minWidth: ICON_COL,
    width: ICON_COL,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: active ? 'primary.main' : 'text.secondary',
  });

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width,
          flexShrink: 0,
          height: '100vh',
          '& .MuiDrawer-paper': {
            width,
            height: '100vh',
            overflowX: 'hidden',
            overflowY: 'auto',
            transition: 'width 0.2s',
            boxSizing: 'border-box',
            position: 'relative',
          },
        }}
      >
        {/* Toggle */}
        <Box sx={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-end' : 'center', px: 1 }}>
          <IconButton onClick={() => setOpen((v) => !v)} size="small">
            {open ? <ChevronLeft fontSize="small" /> : <Menu fontSize="small" />}
          </IconButton>
        </Box>

        <Divider />

        {/* Nav items */}
        <List dense disablePadding sx={{ mt: 0.5 }}>
          {navItems.map(({ text, href, icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Tooltip key={href} title={open ? '' : text} placement="right" arrow>
                <ListItemButton component={Link} href={href} selected={active} sx={itemSx}>
                  <ListItemIcon sx={iconSx(active)}>{icon}</ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={text}
                      primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: active ? 600 : 400, noWrap: true }}
                      sx={{ ml: 0.5 }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>

        {/* Bottom user panel */}
        <Box sx={{ mt: 'auto' }}>
          <Divider />

          {open ? (
            /* ── Expanded bottom ── */
            <Box sx={{ px: 1.5, py: 1.5 }}>
              {/* Avatar + name + email */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: bgColor, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                  {initials(userName)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}>
                    {userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.68rem', lineHeight: 1.3 }}>
                    {userEmail}
                  </Typography>
                </Box>
              </Box>

              {/* Action row */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 0.5 }}>
                <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} arrow>
                  <IconButton size="small" onClick={toggle} sx={{ color: 'text.secondary' }}>
                    {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Settings" arrow>
                  <IconButton size="small" onClick={() => setProfile(true)} sx={{ color: 'text.secondary' }}>
                    <Settings fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Logout" arrow>
                  <IconButton size="small" onClick={() => signOut({ callbackUrl: '/login' })} sx={{ color: 'text.secondary' }}>
                    <Logout fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ) : (
            /* ── Collapsed bottom ── */
            <List dense disablePadding sx={{ py: 0.5 }}>
              <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} placement="right" arrow>
                <ListItemButton onClick={toggle} sx={{ ...itemSx, pl: 1.5 }}>
                  <ListItemIcon sx={iconSx()}>
                    {mode === 'dark' ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
              <Tooltip title="Settings" placement="right" arrow>
                <ListItemButton onClick={() => setProfile(true)} sx={{ ...itemSx, pl: 1.5 }}>
                  <ListItemIcon sx={iconSx()}><Settings fontSize="small" /></ListItemIcon>
                </ListItemButton>
              </Tooltip>
              <Tooltip title="Logout" placement="right" arrow>
                <ListItemButton onClick={() => signOut({ callbackUrl: '/login' })} sx={{ ...itemSx, pl: 1.5 }}>
                  <ListItemIcon sx={iconSx()}><Logout fontSize="small" /></ListItemIcon>
                </ListItemButton>
              </Tooltip>
            </List>
          )}
        </Box>
      </Drawer>

      <ProfileDialog
        open={profileOpen}
        name={userName}
        email={userEmail}
        onClose={() => setProfile(false)}
      />
    </>
  );
}
