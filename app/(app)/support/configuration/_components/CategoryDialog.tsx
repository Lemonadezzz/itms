'use client';

import { useState, useTransition } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import {
  upsertKnowledgeCategory,
  upsertTicketCategory,
} from '@/actions/supportConfigActions';
import type { CategoryAppliesTo } from '@/models/SupportConfig';
import type { KnowledgeCategory, TicketCategory } from '@/lib/data/supportConfig';

export type CategoryKind = 'ticket' | 'knowledge';

type CategoryValue = TicketCategory | KnowledgeCategory;

interface Props {
  open: boolean;
  kind: CategoryKind;
  category: CategoryValue | null;
  onClose: () => void;
  onSaved: (kind: CategoryKind, category: CategoryValue) => void;
}

export function CategoryDialog({ open, kind, category, onClose, onSaved }: Props) {
  const [label, setLabel] = useState(category?.label ?? '');
  const [appliesTo, setAppliesTo] = useState<CategoryAppliesTo>(
    category && 'appliesTo' in category ? category.appliesTo : 'Both'
  );
  const [active, setActive] = useState(category?.active ?? true);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const key = category?.key;

    startTransition(async () => {
      const result =
        kind === 'ticket'
          ? await upsertTicketCategory({ key, label, appliesTo, active })
          : await upsertKnowledgeCategory({ key, label, active });

      if (!result.success) {
        setError(result.error);
        return;
      }

      const savedKey = key ?? label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      onSaved(
        kind,
        kind === 'ticket'
          ? { key: savedKey, label, appliesTo, active }
          : { key: savedKey, label, active }
      );
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700 }}>
        {category ? 'Edit Category' : 'New Category'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2, py: 0 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Category name"
              size="small"
              required
              fullWidth
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            {kind === 'ticket' && (
              <TextField
                select
                label="Applies to"
                size="small"
                fullWidth
                value={appliesTo}
                onChange={(event) => setAppliesTo(event.target.value as CategoryAppliesTo)}
                helperText="Limit this category to one ticket type, or allow both."
              >
                <MenuItem value="Both">Both</MenuItem>
                <MenuItem value="Incident">Incident</MenuItem>
                <MenuItem value="Service Request">Service Request</MenuItem>
              </TextField>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  size="small"
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button size="small" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isPending}
            startIcon={isPending ? <CircularProgress size={12} color="inherit" /> : null}
          >
            {category ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
