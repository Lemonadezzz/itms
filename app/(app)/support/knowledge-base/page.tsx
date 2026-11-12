import { Box } from '@mui/material';
import { requirePageAccess } from '@/lib/access';
import { getKnowledgeArticles } from '@/lib/data/knowledge';
import { getSupportConfig } from '@/lib/data/supportConfig';
import { KnowledgeShell } from './_components/KnowledgeShell';

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function KnowledgeBasePage({ searchParams }: Props) {
  const access = await requirePageAccess('knowledge');
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0));
  const pageSize = ([50, 75, 100].includes(Number(sp.pageSize))
    ? Number(sp.pageSize)
    : 50) as 50 | 75 | 100;

  const canManage = access.permissions.includes('knowledge.manage');
  const canDelete = access.permissions.includes('knowledge.delete');

  const [{ rows, total }, config] = await Promise.all([
    getKnowledgeArticles({
      search: sp.search,
      category: sp.category,
      status: canManage ? sp.status : '',
      includeDrafts: canManage,
      page,
      pageSize,
    }),
    getSupportConfig(),
  ]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <KnowledgeShell
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        categories={config.knowledgeCategories.map((category) => category.label)}
        categoryOptions={config.knowledgeCategories
          .filter((category) => category.active)
          .map((category) => ({ key: category.key, label: category.label }))}
        canManage={canManage}
        canDelete={canDelete}
      />
    </Box>
  );
}
