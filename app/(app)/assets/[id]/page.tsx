import { notFound } from 'next/navigation';
import { Box, Typography, Chip, Divider } from '@mui/material';
import { getAssetById } from '@/lib/data/assets';
import { getEmployeeOptions } from '@/lib/data/employees';
import { AssetLifecycleTestPanel } from '../_components/AssetLifecycleTestPanel';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: Props) {
  const { id } = await params;
  const [asset, employees] = await Promise.all([
    getAssetById(id),
    getEmployeeOptions(),
  ]);

  if (!asset) notFound();

  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{asset.assetName}</Typography>
        <Chip label={asset.assetCode} size="small" sx={{ fontFamily: 'monospace' }} />
        {asset.status && (
          <Chip
            label={asset.status}
            size="small"
            color={
              asset.status === 'In Use' ? 'warning' :
              asset.status === 'In Stock' ? 'success' :
              asset.status === 'Under Repair' ? 'info' :
              asset.status === 'Decommissioned' ? 'error' :
              'default'
            }
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {asset.assetType} · {asset.location}
        {asset.isAssigned && ` · Assigned to ${asset.assignedTo}`}
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {/* Lifecycle Test Panel */}
      <AssetLifecycleTestPanel asset={asset} employees={employees} />
    </Box>
  );
}
