'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { createArticle, updateArticle } from '@/actions/knowledgeActions';
import type { KnowledgeArticleRow } from '@/lib/data/knowledge';

interface Props {
  open: boolean;
  article: KnowledgeArticleRow | null;
  categories: { key: string; label: string }[];
  onClose: () => void;
}

export function ArticleFormDialog({ open, article, categories, onClose }: Props) {
  const router = useRouter();
  const isEdit = !!article;
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(article?.title ?? '');
  const [summary, setSummary] = useState(article?.summary ?? '');
  const [content, setContent] = useState(article?.content ?? '');
  const [category, setCategory] = useState(article?.category ?? '');
  const [tags, setTags] = useState((article?.tags ?? []).join(', '));
  const [status, setStatus] = useState<'Draft' | 'Published'>(
    (article?.status as 'Draft' | 'Published') ?? 'Draft'
  );

  const categoryOptions = useMemo(() => {
    if (article && !categories.some((item) => item.label === article.category)) {
      return [
        ...categories,
        { key: `legacy-${article.category}`, label: article.category },
      ];
    }
    return categories;
  }, [article, categories]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const payload = { title, summary, content, category, tags, status };

    startTransition(async () => {
      const result = isEdit
        ? await updateArticle(article._id, payload)
        : await createArticle(payload);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 700, pb: 1 }}>
        {isEdit ? `Edit “${article.title}”` : 'New Knowledge Article'}
        <Typography variant="caption" display="block" color="text.secondary">
          Plain text or Markdown. Line breaks are preserved when readers view the article.
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, py: 0 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Title"
                size="small"
                required
                fullWidth
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Summary"
                size="small"
                fullWidth
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                helperText="A short description shown on the article card."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Category"
                size="small"
                required
                fullWidth
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categoryOptions.map((item) => (
                  <MenuItem key={item.key} value={item.label}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Status"
                size="small"
                required
                fullWidth
                value={status}
                onChange={(event) => setStatus(event.target.value as 'Draft' | 'Published')}
              >
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Published">Published</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Tags"
                size="small"
                fullWidth
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                helperText="Comma-separated, e.g. vpn, onboarding, printer."
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Content"
                size="small"
                required
                fullWidth
                multiline
                minRows={12}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={'## Before you begin\n\n1. Step one\n2. Step two'}
              />
            </Grid>
          </Grid>
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
            {isEdit ? 'Save Changes' : 'Create Article'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
