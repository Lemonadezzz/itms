'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, MenuBook, Search } from '@mui/icons-material';
import { ArticleDetailDialog } from './ArticleDetailDialog';
import { ArticleFormDialog } from './ArticleFormDialog';
import type { KnowledgeArticleRow } from '@/lib/data/knowledge';

interface Props {
  rows: KnowledgeArticleRow[];
  total: number;
  page: number;
  pageSize: 50 | 75 | 100;
  categories: string[];
  categoryOptions: { key: string; label: string }[];
  canManage: boolean;
  canDelete: boolean;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

export function KnowledgeShell({
  rows,
  total,
  page,
  pageSize,
  categories,
  categoryOptions,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeArticleRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailArticle = detailId ? rows.find((row) => row._id === detailId) ?? null : null;

  function pushParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => params.set(key, String(value)));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Knowledge Base
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {canManage
              ? 'Publish guides and fixes for everyone in the organisation.'
              : 'Browse published guides, fixes, and how-tos.'}
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New Article
          </Button>
        )}
      </Stack>

      <Stack direction="row" gap={1} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search articles…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(event) => pushParams({ search: event.target.value, page: 0 })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 260 }}
        />
        <TextField
          select
          size="small"
          label="Category"
          value={searchParams.get('category') ?? ''}
          onChange={(event) => pushParams({ category: event.target.value, page: 0 })}
          sx={{ width: 180 }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </TextField>
        {canManage && (
          <TextField
            select
            size="small"
            label="Status"
            value={searchParams.get('status') ?? ''}
            onChange={(event) => pushParams({ status: event.target.value, page: 0 })}
            sx={{ width: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Published">Published</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
          </TextField>
        )}
      </Stack>

      {rows.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
            gap: 1,
          }}
        >
          <MenuBook sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography variant="body2">No articles match your filters yet.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ pb: 1 }}>
          {rows.map((article) => (
            <Grid key={article._id} size={{ xs: 12, md: 6, xl: 4 }}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                <CardActionArea
                  sx={{ height: '100%', alignItems: 'stretch' }}
                  onClick={() => setDetailId(article._id)}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                      <Chip
                        label={article.category}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.62rem' }}
                      />
                      {article.status === 'Draft' && (
                        <Chip
                          label="Draft"
                          size="small"
                          color="warning"
                          sx={{ height: 18, fontSize: '0.62rem' }}
                        />
                      )}
                    </Stack>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.35 }}>
                      {article.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        flex: 1,
                      }}
                    >
                      {article.summary || article.content}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {article.authorName} · {formatDate(article.updatedAt)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
          <Pagination
            size="small"
            count={pageCount}
            page={page + 1}
            onChange={(_, value) => pushParams({ page: value - 1 })}
          />
        </Box>
      )}

      {formOpen && (
        <ArticleFormDialog
          open
          article={editing}
          categories={categoryOptions}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {detailArticle && (
        <ArticleDetailDialog
          article={detailArticle}
          canManage={canManage}
          canDelete={canDelete}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditing(detailArticle);
            setDetailId(null);
            setFormOpen(true);
          }}
        />
      )}
    </Box>
  );
}
