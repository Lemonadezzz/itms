'use client';

import { useState, useTransition } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, CircularProgress,
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'success' | 'primary';
  requireText?: string;
  requirePlaceholder?: string;
  requireValidation?: (value: string) => string | null;
  onConfirm: (inputValue: string) => Promise<boolean>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'error',
  requireText,
  requirePlaceholder,
  requireValidation,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const validationError = requireValidation ? requireValidation(input) : '';
  const canConfirm = !requireText || input.trim().length > 0;
  const hasError = validationError !== '';

  const handleConfirm = () => {
    if (requireText && !input.trim()) {
      setError('This field is required.');
      return;
    }
    if (hasError) return;
    startTransition(async () => {
      const result = await onConfirm(input);
      if (result) {
        setInput('');
        setError('');
      }
    });
  };

  const handleClose = () => {
    setInput('');
    setError('');
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {title}
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          {message}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        {requireText && (
          <TextField
            autoFocus
            size="small"
            fullWidth
            label={requireText}
            placeholder={requirePlaceholder}
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            error={!!error || hasError}
            helperText={error || validationError}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button size="small" onClick={handleClose}>Cancel</Button>
        <Button
          size="small"
          variant="contained"
          color={confirmColor}
          disabled={isPending || !canConfirm || hasError}
          startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
