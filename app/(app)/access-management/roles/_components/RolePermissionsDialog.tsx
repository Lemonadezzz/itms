'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Paper, Stack, Typography,
} from '@mui/material';
import {
  MODULE_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_MODULES,
  permissionKey,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/permissions';
import { updateRolePermissions } from '@/actions/roleActions';
import type { RoleRow } from '@/lib/data/roles';

interface Props {
  open: boolean;
  role: RoleRow | null;
  onClose: () => void;
}

export function RolePermissionsDialog({ open, role, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(role?.permissions ?? []));
    setError('');
  }, [open, role?.key]);

  function toggle(moduleKey: PermissionModule, action: PermissionAction, checked: boolean) {
    const key = permissionKey(moduleKey, action);
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
        // Manage implies View.
        if (action === 'manage') next.add(permissionKey(moduleKey, 'view'));
      } else {
        next.delete(key);
        // Dropping View also drops Manage.
        if (action === 'view') next.delete(permissionKey(moduleKey, 'manage'));
      }
      return next;
    });
  }

  function handleSave() {
    if (!role) return;
    setError('');
    startTransition(async () => {
      const result = await updateRolePermissions({
        roleKey: role.key,
        permissions: [...selected],
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        Edit Permissions: {role?.name}
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Manage includes View. Permanent deletion is reserved for the Developer role.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          {PERMISSION_MODULES.map((module) => {
            const actions = MODULE_ACTIONS[module.key].filter((action) => action !== 'delete');
            return (
              <Paper key={module.key} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="body2" fontWeight={700} mb={0.5}>{module.label}</Typography>
                <Stack direction="row" spacing={1.5}>
                  {actions.map((action) => (
                    <FormControlLabel
                      key={action}
                      control={
                        <Checkbox
                          size="small"
                          checked={selected.has(permissionKey(module.key, action))}
                          onChange={(event) => toggle(module.key, action, event.target.checked)}
                        />
                      }
                      label={<Typography variant="caption">{PERMISSION_ACTION_LABELS[action]}</Typography>}
                    />
                  ))}
                </Stack>
              </Paper>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending}>Save Permissions</Button>
      </DialogActions>
    </Dialog>
  );
}
