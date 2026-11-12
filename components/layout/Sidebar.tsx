'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Box, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Tooltip, Divider,
  Avatar, Typography,
} from '@mui/material';
import {
  Dashboard, Inventory, People, ConfirmationNumber,
  Computer, Business, History, Description,
  ChevronLeft, Menu, LightMode, DarkMode, Logout, Settings,
  ExpandLess, ExpandMore, ManageAccounts, Badge, Apartment,
  AdminPanelSettings, Group, VpnKey, SupportAgent, MenuBook, Insights, Tune,
  DevicesOther,
} from '@mui/icons-material';
import { useColorMode } from '@/theme/ThemeProvider';
import { ProfileDialog } from './ProfileDialog';

const EXPANDED = 240;
const COLLAPSED = 60;
const ICON_COL = 36;

const assetChildren = [
  { text: 'Overview', href: '/assets-overview', icon: <Dashboard fontSize="small" />, permission: 'assets.view' },
  { text: 'Hardware', href: '/assets', icon: <Inventory fontSize="small" />, permission: 'assets.view' },
  { text: 'Software', href: '/software', icon: <Computer fontSize="small" />, permission: 'software.view' },
  { text: 'End-Users', href: '/end-user-management', icon: <People fontSize="small" />, permission: 'employees.view' },
  { text: 'Contracts', href: '/contracts', icon: <Description fontSize="small" />, permission: 'contracts.view' },
  { text: 'Suppliers', href: '/suppliers', icon: <Business fontSize="small" />, permission: 'suppliers.view' },
  { text: 'Logs', href: '/logs', icon: <History fontSize="small" />, permission: 'logs.view' },
];

const employeeChildren = [
  { text: 'Employees', href: '/employees', icon: <Badge fontSize="small" />, permission: 'employees.view' },
  { text: 'Departments', href: '/departments', icon: <Apartment fontSize="small" />, permission: 'departments.view' },
];

const supportChildren = [
  { text: 'My Tickets', href: '/support/my-tickets', icon: <ConfirmationNumber fontSize="small" />, permission: undefined },
  { text: 'My Devices & Software', href: '/support/my-devices', icon: <DevicesOther fontSize="small" />, permission: undefined },
  { text: 'Tickets', href: '/tickets', icon: <SupportAgent fontSize="small" />, permission: 'tickets.view' },
  { text: 'Knowledge Base', href: '/support/knowledge-base', icon: <MenuBook fontSize="small" />, permission: 'knowledge.view' },
  { text: 'Reports & Analytics', href: '/support/reports', icon: <Insights fontSize="small" />, permission: 'reports.view' },
  { text: 'Support Configuration', href: '/support/configuration', icon: <Tune fontSize="small" />, permission: 'support.manage' },
];

const accessChildren = [
  { text: 'User Accounts', href: '/access-management/user-accounts', icon: <Group fontSize="small" />, permission: 'access.view' },
  { text: 'Roles', href: '/access-management/roles', icon: <AdminPanelSettings fontSize="small" />, permission: 'access.view' },
  { text: 'Permissions', href: '/access-management/permissions', icon: <VpnKey fontSize="small" />, permission: 'access.view' },
];

function isActive(pathname: string, href: string) {
  if (href === '/assets-overview') return pathname === '/assets-overview';
  if (href === '/assets') return pathname === '/assets' || pathname.startsWith('/assets/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

function avatarColor(name: string) {
  const colors = ['#F05340', '#4085F0', '#269066', '#8b5cf6', '#eab308', '#f97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export function Sidebar() {
  const [open, setOpen] = useState(true);
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [employeesOpen, setEmployeesOpen] = useState(true);
  const [supportOpen, setSupportOpen] = useState(true);
  const [accessOpen, setAccessOpen] = useState(true);
  const [profileOpen, setProfile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toggle, mode } = useColorMode();
  const { data: session } = useSession();
  const width = open ? EXPANDED : COLLAPSED;
  const permissions = session?.user?.permissions;
  // A missing permission list means a legacy token: show everything until it refreshes.
  const canView = (permission?: string) => !permission || !permissions || permissions.includes(permission);
  const visibleAssets = assetChildren.filter((item) => canView(item.permission));
  const visibleEmployees = employeeChildren.filter((item) => canView(item.permission));
  const visibleSupport = supportChildren.filter((item) => canView(item.permission));
  const visibleAccess = accessChildren.filter((item) => canView(item.permission));
  const assetsActive =
    pathname === '/assets-overview' || visibleAssets.some((item) => isActive(pathname, item.href));
  const employeesActive = visibleEmployees.some((item) => isActive(pathname, item.href));
  const supportActive = visibleSupport.some((item) => isActive(pathname, item.href));
  const accessActive = visibleAccess.some((item) => isActive(pathname, item.href));

  const userName = session?.user?.name ?? '—';
  const userEmail = session?.user?.email ?? '—';
  const bgColor = avatarColor(userName);

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
        {/* Brand + Toggle */}
        <Box sx={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', px: 1, overflow: 'hidden' }}>
          {open && (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, pl: 1 }}>
              <Typography fontWeight={800} sx={{ color: '#F05340', fontSize: '0.95rem', lineHeight: 1 }}>ITMS</Typography>
              <Typography sx={{ color: 'text.disabled', fontSize: '0.62rem', lineHeight: 1 }}>v1.5.0</Typography>
            </Box>
          )}
          <IconButton onClick={() => setOpen((v) => !v)} size="small">
            {open ? <ChevronLeft fontSize="small" /> : <Menu fontSize="small" />}
          </IconButton>
        </Box>

        <Divider />

        {/* Nav items */}
        <List dense disablePadding sx={{ mt: 0.5 }}>
          {/* Assets category — the label links to the Overview page */}
          {visibleAssets.length > 0 && (
            <Tooltip title={open ? '' : 'Assets'} placement="right" arrow>
              <ListItemButton component="div" onClick={() => router.push('/assets-overview')} sx={{ ...itemSx, cursor: 'pointer' }}>
                <ListItemIcon sx={iconSx(assetsActive)}>
                  <Inventory fontSize="small" />
                </ListItemIcon>
                {open && (
                  <>
                    <ListItemText
                      primary="Assets"
                      primaryTypographyProps={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        noWrap: true,
                        color: assetsActive ? 'primary.main' : 'inherit',
                      }}
                      sx={{ ml: 0.5 }}
                    />
                    <IconButton
                      size="small"
                      aria-label={assetsOpen ? 'Collapse Assets' : 'Expand Assets'}
                      onClick={(e) => { e.stopPropagation(); setAssetsOpen((v) => !v); }}
                      sx={{ mr: 0.5, color: 'text.secondary' }}
                    >
                      {assetsOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </IconButton>
                  </>
                )}
              </ListItemButton>
            </Tooltip>
          )}

          {(open ? assetsOpen : true) && visibleAssets.map(({ text, href, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Tooltip key={href} title={open ? '' : text} placement="right" arrow>
                <ListItemButton
                  component={Link}
                  href={href}
                  selected={active}
                  sx={open ? { ...itemSx, pl: '44px' } : itemSx}
                >
                  <ListItemIcon
                    sx={{
                      ...iconSx(active),
                      minWidth: open ? 24 : ICON_COL,
                      width: open ? 24 : ICON_COL,
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={text}
                      primaryTypographyProps={{
                        fontSize: '0.75rem',
                        fontWeight: active ? 600 : 400,
                        noWrap: true,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}

          {/* Employee Management category */}
          {visibleEmployees.length > 0 && (
            <Tooltip title={open ? '' : 'Employee Management'} placement="right" arrow>
              <ListItemButton component="div" onClick={() => setEmployeesOpen((v) => !v)} sx={{ ...itemSx, cursor: 'pointer' }}>
                <ListItemIcon sx={iconSx(employeesActive)}>
                  <ManageAccounts fontSize="small" />
                </ListItemIcon>
                {open && (
                  <>
                    <ListItemText
                      primary="Employee Management"
                      primaryTypographyProps={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        noWrap: true,
                        color: employeesActive ? 'primary.main' : 'inherit',
                      }}
                      sx={{ ml: 0.5 }}
                    />
                    <IconButton
                      size="small"
                      aria-label={employeesOpen ? 'Collapse Employee Management' : 'Expand Employee Management'}
                      onClick={(e) => { e.stopPropagation(); setEmployeesOpen((v) => !v); }}
                      sx={{ mr: 0.5, color: 'text.secondary' }}
                    >
                      {employeesOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </IconButton>
                  </>
                )}
              </ListItemButton>
            </Tooltip>
          )}

          {(open ? employeesOpen : true) && visibleEmployees.map(({ text, href, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Tooltip key={href} title={open ? '' : text} placement="right" arrow>
                <ListItemButton
                  component={Link}
                  href={href}
                  selected={active}
                  sx={open ? { ...itemSx, pl: '44px' } : itemSx}
                >
                  <ListItemIcon
                    sx={{
                      ...iconSx(active),
                      minWidth: open ? 24 : ICON_COL,
                      width: open ? 24 : ICON_COL,
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={text}
                      primaryTypographyProps={{
                        fontSize: '0.75rem',
                        fontWeight: active ? 600 : 400,
                        noWrap: true,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}

          {/* IT Support category */}
          <Tooltip title={open ? '' : 'IT Support'} placement="right" arrow>
            <ListItemButton component="div" onClick={() => setSupportOpen((v) => !v)} sx={{ ...itemSx, cursor: 'pointer' }}>
              <ListItemIcon sx={iconSx(supportActive)}>
                <SupportAgent fontSize="small" />
              </ListItemIcon>
              {open && (
                <>
                  <ListItemText
                    primary="IT Support"
                    primaryTypographyProps={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      noWrap: true,
                      color: supportActive ? 'primary.main' : 'inherit',
                    }}
                    sx={{ ml: 0.5 }}
                  />
                  <IconButton
                    size="small"
                    aria-label={supportOpen ? 'Collapse IT Support' : 'Expand IT Support'}
                    onClick={(e) => { e.stopPropagation(); setSupportOpen((v) => !v); }}
                    sx={{ mr: 0.5, color: 'text.secondary' }}
                  >
                    {supportOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                  </IconButton>
                </>
              )}
            </ListItemButton>
          </Tooltip>

          {(open ? supportOpen : true) && visibleSupport.map(({ text, href, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Tooltip key={href} title={open ? '' : text} placement="right" arrow>
                <ListItemButton
                  component={Link}
                  href={href}
                  selected={active}
                  sx={open ? { ...itemSx, pl: '44px' } : itemSx}
                >
                  <ListItemIcon
                    sx={{
                      ...iconSx(active),
                      minWidth: open ? 24 : ICON_COL,
                      width: open ? 24 : ICON_COL,
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={text}
                      primaryTypographyProps={{
                        fontSize: '0.75rem',
                        fontWeight: active ? 600 : 400,
                        noWrap: true,
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}

          {visibleAccess.length > 0 && (
            <>
              <Tooltip title={open ? '' : 'Access Management'} placement="right" arrow>
                <ListItemButton component="div" onClick={() => setAccessOpen((v) => !v)} sx={{ ...itemSx, cursor: 'pointer' }}>
                  <ListItemIcon sx={iconSx(accessActive)}>
                    <AdminPanelSettings fontSize="small" />
                  </ListItemIcon>
                  {open && (
                    <>
                      <ListItemText
                        primary="Access Management"
                        primaryTypographyProps={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          noWrap: true,
                          color: accessActive ? 'primary.main' : 'inherit',
                        }}
                        sx={{ ml: 0.5 }}
                      />
                      <IconButton
                        size="small"
                        aria-label={accessOpen ? 'Collapse Access Management' : 'Expand Access Management'}
                        onClick={(e) => { e.stopPropagation(); setAccessOpen((v) => !v); }}
                        sx={{ mr: 0.5, color: 'text.secondary' }}
                      >
                        {accessOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                      </IconButton>
                    </>
                  )}
                </ListItemButton>
              </Tooltip>

              {(open ? accessOpen : true) && visibleAccess.map(({ text, href, icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Tooltip key={href} title={open ? '' : text} placement="right" arrow>
                    <ListItemButton
                      component={Link}
                      href={href}
                      selected={active}
                      sx={open ? { ...itemSx, pl: '44px' } : itemSx}
                    >
                      <ListItemIcon
                        sx={{
                          ...iconSx(active),
                          minWidth: open ? 24 : ICON_COL,
                          width: open ? 24 : ICON_COL,
                        }}
                      >
                        {icon}
                      </ListItemIcon>
                      {open && (
                        <ListItemText
                          primary={text}
                          primaryTypographyProps={{
                            fontSize: '0.75rem',
                            fontWeight: active ? 600 : 400,
                            noWrap: true,
                          }}
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>
                );
              })}
            </>
          )}
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
