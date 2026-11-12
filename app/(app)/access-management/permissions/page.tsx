import {
  Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { EditNote } from '@mui/icons-material';
import { getRoles } from '@/lib/data/roles';
import { requirePageAccess } from '@/lib/access';
import {
  MODULE_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_MODULES,
  hasPermission,
  permissionKey,
  type PermissionModule,
} from '@/lib/permissions';

function grantedActions(permissions: string[], moduleKey: PermissionModule): string[] {
  return MODULE_ACTIONS[moduleKey]
    .filter((action) => hasPermission(permissions, permissionKey(moduleKey, action)))
    .map((action) => PERMISSION_ACTION_LABELS[action]);
}

export default async function PermissionsPage() {
  const access = await requirePageAccess('access');
  const roles = await getRoles();
  const canManage = hasPermission(access.permissions, permissionKey('access', 'manage'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight={700}>Permissions</Typography>
        {canManage && (
          <Button
            href="/access-management/roles"
            size="small"
            startIcon={<EditNote sx={{ fontSize: 16 }} />}
          >
            Edit Admin Permissions
          </Button>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary">
        Permission catalog and role coverage. Admin permissions are edited from the Roles page;
        this page is read-only. Permanent deletion is reserved for the Developer role.
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 200 }}>Module</TableCell>
              {roles.map((role) => (
                <TableCell key={role.key} align="center" sx={{ fontWeight: 700 }}>
                  {role.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {PERMISSION_MODULES.map((module) => (
              <TableRow key={module.key} hover>
                <TableCell sx={{ fontWeight: 600 }}>{module.label}</TableCell>
                {roles.map((role) => {
                  const actions = grantedActions(role.permissions, module.key);
                  return (
                    <TableCell key={role.key} align="center">
                      {actions.length === 0 ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap" useFlexGap>
                          {actions.map((action) => (
                            <Chip
                              key={action}
                              label={action}
                              size="small"
                              color={action === 'Delete' ? 'error' : action === 'Manage' ? 'warning' : 'default'}
                              variant={action === 'View' ? 'outlined' : 'filled'}
                              sx={{ fontSize: '0.6rem', height: 18 }}
                            />
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
