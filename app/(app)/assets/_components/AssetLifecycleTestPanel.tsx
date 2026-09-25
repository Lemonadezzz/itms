'use client';

import { useState, useTransition } from 'react';
import {
  transferAsset,
  markForRepair,
  completeRepair,
  decommissionAsset,
} from '@/actions/assetActions';
import type { AssetRow } from '@/types';

interface Props {
  asset: AssetRow;
  employees: { _id: string; employeeName: string }[];
}

export function AssetLifecycleTestPanel({ asset, employees }: Props) {
  const [isPending, startTransition] = useTransition();
  const [log, setLog] = useState<string[]>([]);
  const [transferEmpId, setTransferEmpId] = useState('');
  const [decommissionReason, setDecommissionReason] = useState('');

  function addLog(msg: string) {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  }

  function handleTransfer() {
    if (!transferEmpId) return alert('Select an employee first.');
    startTransition(async () => {
      const res = await transferAsset(asset._id, transferEmpId);
      addLog(res.success ? `✅ Transferred to employee ${transferEmpId}` : `❌ Transfer failed: ${res.error}`);
    });
  }

  function handleMarkRepair() {
    const issue = prompt('Describe the issue:');
    if (!issue) return;
    startTransition(async () => {
      const res = await markForRepair(asset._id, issue);
      addLog(res.success ? `✅ Marked for repair: "${issue}"` : `❌ Failed: ${res.error}`);
    });
  }

  function handleCompleteRepair() {
    const notes = prompt('Resolution notes (optional):') ?? '';
    startTransition(async () => {
      const res = await completeRepair(asset._id, notes || undefined);
      addLog(res.success ? `✅ Repair completed` : `❌ Failed: ${res.error}`);
    });
  }

  function handleDecommission() {
    if (!decommissionReason.trim()) return alert('Enter a decommission reason.');
    if (!confirm(`Decommission ${asset.assetCode}? This will soft-delete the asset.`)) return;
    startTransition(async () => {
      const res = await decommissionAsset(asset._id, decommissionReason);
      addLog(res.success ? `✅ Decommissioned: "${decommissionReason}"` : `❌ Failed: ${res.error}`);
    });
  }

  return (
    <div style={{ fontFamily: 'monospace', fontSize: '13px', border: '1px solid #ccc', borderRadius: 6, padding: 16, marginTop: 16, background: '#fafafa' }}>
      <strong style={{ fontSize: 14 }}>🛠 Lifecycle Test Panel — {asset.assetCode}</strong>
      <p style={{ margin: '4px 0 12px', color: '#666', fontSize: 12 }}>
        Status: <b>{asset.status ?? (asset.isAssigned ? 'In Use' : 'In Stock')}</b>
        {asset.isAssigned && ` · Assigned to: ${asset.assignedTo ?? '—'}`}
      </p>

      {/* ── Transfer ── */}
      <fieldset style={{ marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px' }}>
        <legend style={{ fontWeight: 700 }}>Transfer</legend>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={transferEmpId}
            onChange={(e) => setTransferEmpId(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', minWidth: 200 }}
          >
            <option value="">— Select Employee —</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.employeeName}</option>
            ))}
          </select>
          <button
            onClick={handleTransfer}
            disabled={isPending}
            style={{ padding: '4px 14px', borderRadius: 4, border: '1px solid #1976d2', background: '#1976d2', color: '#fff', cursor: 'pointer' }}
          >
            Transfer Asset
          </button>
        </div>
      </fieldset>

      {/* ── Repair ── */}
      <fieldset style={{ marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px' }}>
        <legend style={{ fontWeight: 700 }}>Repair</legend>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleMarkRepair}
            disabled={isPending}
            style={{ padding: '4px 14px', borderRadius: 4, border: '1px solid #ed6c02', background: '#ed6c02', color: '#fff', cursor: 'pointer' }}
          >
            Mark for Repair
          </button>
          <button
            onClick={handleCompleteRepair}
            disabled={isPending}
            style={{ padding: '4px 14px', borderRadius: 4, border: '1px solid #2e7d32', background: '#2e7d32', color: '#fff', cursor: 'pointer' }}
          >
            Complete Repair
          </button>
        </div>
      </fieldset>

      {/* ── Decommission ── */}
      <fieldset style={{ marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px' }}>
        <legend style={{ fontWeight: 700 }}>Decommission</legend>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Reason for decommission…"
            value={decommissionReason}
            onChange={(e) => setDecommissionReason(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ccc', minWidth: 220, flex: 1 }}
          />
          <button
            onClick={handleDecommission}
            disabled={isPending}
            style={{ padding: '4px 14px', borderRadius: 4, border: '1px solid #d32f2f', background: '#d32f2f', color: '#fff', cursor: 'pointer' }}
          >
            Decommission
          </button>
        </div>
      </fieldset>

      {/* ── Assignment History ── */}
      <fieldset style={{ marginBottom: 12, border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px' }}>
        <legend style={{ fontWeight: 700 }}>Assignment History ({asset.assignmentHistory.length})</legend>
        {asset.assignmentHistory.length === 0 ? (
          <p style={{ color: '#999', margin: 0 }}>No assignment history.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {asset.assignmentHistory.map((h, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <b>{h.employeeName || '(unnamed)'}</b>
                {' · Assigned: '}{h.assignedAt.split('T')[0]}
                {h.returnedAt ? ` · Returned: ${h.returnedAt.split('T')[0]}` : ' · ⚡ Currently Assigned'}
                {h.notes ? ` · ${h.notes}` : ''}
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {/* ── Action Log ── */}
      {log.length > 0 && (
        <fieldset style={{ border: '1px solid #ddd', borderRadius: 4, padding: '8px 12px' }}>
          <legend style={{ fontWeight: 700 }}>Action Log</legend>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#333' }}>
            {log.map((entry, i) => <li key={i}>{entry}</li>)}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
