'use client';

import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Computer,
  Description,
  DevicesOther,
  Inventory,
  Laptop,
  Monitor,
  DesktopWindows,
} from '@mui/icons-material';
import type {
  MyContract,
  MyDevice,
  MyDevicesData,
  MySoftware,
} from '@/lib/data/myDevices';
import { AssetValueSchedule } from './AssetValueSchedule';

const peso = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 10);
};

const TYPE_META: Record<MyDevice['assetType'], { label: string; color: string; icon: ReactNode }> = {
  laptop: { label: 'Laptop', color: '#F05340', icon: <Laptop fontSize="small" /> },
  desktop: { label: 'Desktop', color: '#4085F0', icon: <DesktopWindows fontSize="small" /> },
  display: { label: 'Display', color: '#269066', icon: <Monitor fontSize="small" /> },
};

const DEVICE_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  Ordered: 'info',
  'In Stock': 'success',
  'In Use': 'warning',
  Retired: 'error',
};

const SOFTWARE_STATUS_COLOR: Record<
  MySoftware['status'],
  'default' | 'success' | 'warning' | 'info'
> = {
  Active: 'success',
  'Deprecated / Legacy': 'default',
  'In Development': 'info',
  'Under Review': 'warning',
};

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography component="div" variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography component="div" variant="body2" fontWeight={500}>
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
      <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.68rem' }} />
      <Typography variant="caption" color="text.secondary">
        {description}
      </Typography>
    </Box>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Paper sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </Paper>
  );
}

function DeviceCard({ device }: { device: MyDevice }) {
  const type = TYPE_META[device.assetType] ?? TYPE_META.laptop;

  return (
    <Paper sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={1}
        flexWrap="wrap"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: type.color,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {type.icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {device.assetName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: 'monospace' }}
            >
              {device.assetCode}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" gap={0.75} flexWrap="wrap">
          <Chip label={type.label} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
          {device.status && (
            <Chip
              label={device.status}
              size="small"
              color={DEVICE_STATUS_COLOR[device.status] ?? 'default'}
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          )}
          {device.isOnContract && (
            <Chip
              label="On Contract"
              size="small"
              color="success"
              sx={{ fontSize: '0.7rem', height: 22, fontWeight: 700 }}
            />
          )}
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6, md: 12 }}>
              <InfoRow label="Location" value={device.location} />
            </Grid>
            <Grid size={{ xs: 6, md: 12 }}>
              <InfoRow label="Cost Center" value={device.costCenter?.trim() || '—'} />
            </Grid>
            <Grid size={{ xs: 6, md: 12 }}>
              <InfoRow label="Assigned Date" value={formatDate(device.assignedDate)} />
            </Grid>
            <Grid size={{ xs: 6, md: 12 }}>
              <InfoRow label="Acquisition Date" value={formatDate(device.acquisitionDate)} />
            </Grid>
            <Grid size={{ xs: 6, md: 12 }}>
              <InfoRow label="Acquisition Cost" value={peso(device.acquisitionCost)} />
            </Grid>
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Asset Value Schedule
          </Typography>
          <AssetValueSchedule
            acquisitionCost={device.acquisitionCost}
            acquisitionDate={device.acquisitionDate}
            depreciationMethod={device.depreciationMethod}
            assignedDate={device.assignedDate}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}

function ContractCard({ contract }: { contract: MyContract }) {
  const isFullyPaid = contract.status === 'Fully Paid';
  const paidPercent =
    contract.totalContribution > 0
      ? Math.min(100, (contract.totalPaid / contract.totalContribution) * 100)
      : 0;
  const showSchedule = !contract.deviceAssignedToUser;

  return (
    <Paper sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={1}
        flexWrap="wrap"
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Description fontSize="small" color="disabled" />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {contract.assetName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: 'monospace' }}
            >
              {contract.assetCode}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {contract.deviceAssignedToUser && (
            <Chip
              label="On Contract"
              size="small"
              color="success"
              sx={{ fontSize: '0.7rem', height: 22, fontWeight: 700 }}
            />
          )}
          <Chip
            label={contract.status}
            size="small"
            color={isFullyPaid ? 'success' : 'warning'}
            sx={{ fontSize: '0.7rem', height: 22 }}
          />
          <Chip
            label="Active"
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 22 }}
          />
        </Stack>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Issued Date" value={formatDate(contract.issuedDate)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Contract End" value={formatDate(contract.contractEnd)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Payment End" value={formatDate(contract.finishDate)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Tenure" value={contract.tenure} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Term" value={`${contract.numberOfMonths} months`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Per Cutoff" value={peso(contract.perCutoff)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Per Month" value={peso(contract.perMonth)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Total Contribution" value={peso(contract.totalContribution)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Paid to Date" value={peso(contract.totalPaid)} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow
            label="Remaining Balance"
            value={
              <Typography
                component="span"
                variant="body2"
                fontWeight={700}
                color={contract.remaining > 0 ? 'primary' : 'success.main'}
              >
                {peso(contract.remaining)}
              </Typography>
            }
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
          <InfoRow label="Laptop Cost" value={peso(contract.acquisitionCost)} />
        </Grid>
      </Grid>

      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Contribution progress
          </Typography>
          <Typography variant="caption" fontWeight={700}>
            {paidPercent.toFixed(1)}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={paidPercent}
          color={isFullyPaid ? 'success' : 'warning'}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      {showSchedule && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Asset Value Schedule
          </Typography>
          <AssetValueSchedule
            acquisitionCost={contract.acquisitionCost}
            acquisitionDate={contract.acquisitionDate}
            depreciationMethod={contract.depreciationMethod}
            assignedDate={contract.issuedDate}
          />
        </>
      )}
    </Paper>
  );
}

function SoftwareTable({ software }: { software: MySoftware[] }) {
  return (
    <TableContainer component={Paper}>
      <Table size="small" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell><strong>Software</strong></TableCell>
            <TableCell><strong>Category</strong></TableCell>
            <TableCell><strong>License</strong></TableCell>
            <TableCell><strong>Status</strong></TableCell>
            <TableCell><strong>Owner</strong></TableCell>
            <TableCell><strong>Renewal</strong></TableCell>
            <TableCell><strong>Support</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {software.map((item) => (
            <TableRow key={item._id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  {item.softwareName}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption">{item.category}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption">{item.licenseType || '—'}</Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={item.status}
                  size="small"
                  color={SOFTWARE_STATUS_COLOR[item.status] ?? 'default'}
                  sx={{ fontSize: '0.68rem', height: 20 }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="caption">{item.appOwner || '—'}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption">{formatDate(item.renewalDate)}</Typography>
              </TableCell>
              <TableCell>
                {item.supportLink ? (
                  <Link
                    href={item.supportLink}
                    target="_blank"
                    rel="noreferrer"
                    variant="caption"
                    underline="hover"
                  >
                    Open
                  </Link>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    —
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function MyDevicesShell({
  employee,
  devices,
  contracts,
  software,
}: MyDevicesData) {
  const onContractCount = devices.filter((device) => device.isOnContract).length;
  const stats = [
    { label: 'Devices', value: devices.length, icon: <DevicesOther fontSize="small" />, color: 'primary.main' },
    { label: 'On Contract', value: onContractCount, icon: <Inventory fontSize="small" />, color: 'success.main' },
    { label: 'Active Contracts', value: contracts.length, icon: <Description fontSize="small" />, color: 'info.main' },
    { label: 'Software', value: software.length, icon: <Computer fontSize="small" />, color: 'secondary.main' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 3 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          My Devices &amp; Software
        </Typography>
        <Typography variant="caption" color="text.secondary">
          A read-only overview of the company equipment, active contracts, and software assigned to
          you.
        </Typography>
        {employee && (
          <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip label={employee.employeeName} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
            <Chip
              label={employee.department}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
            <Chip
              label={employee.status}
              size="small"
              color={employee.status === 'Active' ? 'success' : 'default'}
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          </Stack>
        )}
      </Box>

      {!employee && (
        <Alert severity="info">
          Your account is not linked to an employee profile yet, so company devices, contracts, and
          software cannot be shown. Please contact IT support to have your profile linked.
        </Alert>
      )}

      <Grid container spacing={1.5}>
        {stats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ color: stat.color, display: 'flex' }}>{stat.icon}</Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionHeader
          title="My Devices"
          description="Hardware currently assigned to you, with its value schedule."
          count={devices.length}
        />
        {devices.length === 0 ? (
          <EmptyState>No devices are currently assigned to you.</EmptyState>
        ) : (
          devices.map((device) => <DeviceCard key={device._id} device={device} />)
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionHeader
          title="My Active Contracts"
          description="Devices you are paying for through payroll deduction."
          count={contracts.length}
        />
        {contracts.length === 0 ? (
          <EmptyState>You have no active contracts.</EmptyState>
        ) : (
          contracts.map((contract) => <ContractCard key={contract._id} contract={contract} />)
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SectionHeader
          title="My Software"
          description="Applications assigned to your employee profile."
          count={software.length}
        />
        {software.length === 0 ? (
          <EmptyState>No software is currently assigned to you.</EmptyState>
        ) : (
          <SoftwareTable software={software} />
        )}
      </Box>
    </Box>
  );
}
