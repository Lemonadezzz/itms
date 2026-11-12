'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, Delete, Edit } from '@mui/icons-material';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteArticle } from '@/actions/knowledgeActions';
import type { KnowledgeArticleRow } from '@/lib/data/knowledge';

interface Props {
  article: KnowledgeArticleRow;
  canManage: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

export function ArticleDetailDialog({
  article,
  canManage,
  canDelete,
  onClose,
  onEdit,
}: Props) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={article.category} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
            <Chip
              label={article.status}
              size="small"
              color={article.status === 'Published' ? 'success' : 'warning'}
              sx={{ height: 20, fontSize: '0.68rem' }}
            />
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Close">
              <IconButton size="small" onClick={onClose}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Typography component="div" variant="subtitle1" fontWeight={700} sx={{ mt: 0.75 }}>
            {article.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {article.authorName} · Updated {formatDate(article.updatedAt)}
            {article.publishedAt ? ` · Published ${formatDate(article.publishedAt)}` : ''}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          {article.summary && (
            <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ mb: 2 }}>
              {article.summary}
            </Typography>
          )}

          {article.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2 }}>
              {article.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: '0.62rem' }} />
              ))}
            </Stack>
          )}

          <Divider sx={{ mb: 2 }} />

          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {article.content}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button size="small" onClick={onClose}>
            Close
          </Button>
          <Box sx={{ flex: 1 }} />
          {canDelete && (
            <Button
              size="small"
              color="error"
              startIcon={<Delete />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
          {canManage && (
            <Button size="small" startIcon={<Edit />} onClick={onEdit}>
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${article.title}”?`}
        message="This permanently removes the article. Only a Developer can do this."
        confirmLabel="Delete"
        onConfirm={async () => {
          const result = await deleteArticle(article._id);
          if (!result.success) {
            setError(result.error);
            return false;
          }
          setConfirmDelete(false);
          router.refresh();
          onClose();
          return true;
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
