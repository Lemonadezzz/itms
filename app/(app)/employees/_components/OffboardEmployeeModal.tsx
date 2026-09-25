'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, List, ListItem, ListItemText, Divider, Alert, Paper } from '@mui/material';
import { PersonRemove, TransferWithinAStation } from '@mui/icons-material';
import { checkEmployeeAssets, offboardEmployee, reactivateEmployee } from '@/actions/employeeActions';

interface Props {
  open: boolean;
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  isOffboard?: boolean;
}

export function OffboardEmployeeModal({ open, employeeId, employeeName, onClose, isOffboard = true }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [assets, setAssets] = useState<Array<{ _id: string; assetCode: string; assetName: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const actionTitle = isOffboard ? 'Inactivate Employee' : 'Reactivate Employee';
  const actionButton = isOffboard ? 'Confirm Inactivate' : 'Confirm Reactivate';
  const actionColor = isOffboard ? 'error' : 'success';
  const actionIcon = isOffboard ? <PersonRemove sx={{ mr: 0.5 }} /> : <TransferWithinAStation sx={{ mr: 0.5 }} />;
  const headerColor = isOffboard ? 'error' : 'success';
  const alertSeverity = isOffboard ? 'warning' : 'info';
  const hasAssets = assets.length > 0;
  const actionVerb = isOffboard ? 'Inactivated' : 'Reactivated';
  const statusText = isOffboard ? 'Inactive' : 'Active';

  // Reset state when modal opens with new employee
  useEffect(() => {
    if (open) {
      setAssets([]);
      setLoading(false);
      setError(null);
      setSuccess(false);
      // Auto-check assets for inactivation
      if (isOffboard) {
        handleCheckAssets();
      }
    }
  }, [open, employeeId]);

  async function handleCheckAssets() {
    setLoading(true);
    setError(null);
    const result = await checkEmployeeAssets(employeeId);
    setLoading(false);
    if (result.success) {
      setAssets(result.data.assets);
    } else {
      setError(result.error);
    }
  }

  async function handleAction() {
    setLoading(true);
    setError(null);
    const result = isOffboard
      ? await offboardEmployee(employeeId, true)
      : await reactivateEmployee(employeeId);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
  }

  // Success dialog - manual close required (no auto-close)
  if (success) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 700, py: 2 }}>
          Employee {actionVerb}
        </DialogTitle>
        <DialogContent suppressHydrationWarning>
          <Paper sx={{ p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {isOffboard ? <PersonRemove sx={{ color: 'success.main', fontSize: 32 }} /> : <TransferWithinAStation sx={{ color: 'success.main', fontSize: 32 }} />}
              <Typography variant="body1" fontWeight={600} color="success.dark">
                {employeeName} has been successfully set to <Typography component="span" fontWeight={700}>{statusText}</Typography> status.
                {hasAssets ? ` All ${assets.length} assigned asset${assets.length === 1 ? '' : 's'} have been returned to inventory.` : ' This employee had no active assets assigned.'}
              </Typography>
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="contained" onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 700, pb: 0, color: `${headerColor}.main` }}>
        {actionIcon} {actionTitle}
      </DialogTitle>
      <Typography variant="body1" sx={{ px: 2, pb: 1.5, fontWeight: 500 }}>
        {employeeName}
      </Typography>

      <DialogContent sx={{ pt: 2 }} suppressHydrationWarning>
        {assets.length === 0 && !isOffboard && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            This will reactivate {employeeName} and set their status to Active.
          </Alert>
        )}

        {isOffboard && assets.length === 0 && loading === false && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            This employee has no active assets assigned.
          </Alert>
        )}

        {isOffboard && assets.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Alert severity={alertSeverity} sx={{ mb: 1.5 }}>
              This employee has {assets.length} active asset{assets.length === 1 ? '' : 's'} assigned. Proceeding will automatically return them to inventory.
            </Alert>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1, mb: 1 }}>Assigned Assets:</Typography>
            <List dense sx={{ pl: 0 }}>
              {assets.map((asset) => (
                <ListItem key={asset._id} sx={{ pl: 0 }}>
                  <ListItemText
                    primary={asset.assetCode}
                    secondary={asset.assetName}
                    primaryTypographyProps={{ fontWeight: 500, fontFamily: 'monospace' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Typography variant="body2" sx={{ mt: 2 }}>
          {isOffboard 
            ? <span>This will set the employee status to <strong>Inactive</strong>. Inactive employees cannot be assigned devices.</span>
            : <span>This will set the employee status to <strong>Active</strong>. They will be able to be assigned devices again.</span>}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          color={actionColor}
          onClick={handleAction}
          disabled={loading}
          startIcon={actionIcon}
        >
          {actionButton}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
