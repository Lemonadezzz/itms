import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { Role } from '../models/Role';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI not set in .env.local');

const TICKET_STATUSES = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'] as const;

const DEFAULT_TICKET_CATEGORIES = [
  { key: 'hardware', label: 'Hardware', appliesTo: 'Both', active: true },
  { key: 'software', label: 'Software', appliesTo: 'Both', active: true },
  { key: 'network', label: 'Network', appliesTo: 'Both', active: true },
  { key: 'accounts-access', label: 'Accounts & Access', appliesTo: 'Both', active: true },
  { key: 'other', label: 'Other', appliesTo: 'Both', active: true },
];

const DEFAULT_KNOWLEDGE_CATEGORIES = [
  { key: 'getting-started', label: 'Getting Started', active: true },
  { key: 'hardware', label: 'Hardware', active: true },
  { key: 'software', label: 'Software', active: true },
  { key: 'network', label: 'Network', active: true },
  { key: 'accounts-access', label: 'Accounts & Access', active: true },
];

const ADMIN_PERMISSIONS = [
  'knowledge.view',
  'knowledge.manage',
  'reports.view',
  'support.view',
  'support.manage',
  'tickets.view',
];

const normalizeStatus = (value: unknown): (typeof TICKET_STATUSES)[number] => {
  const raw = String(value ?? 'Open');
  const mapped = raw === 'In-Progress' ? 'In Progress' : raw;
  return (TICKET_STATUSES as readonly string[]).includes(mapped)
    ? (mapped as (typeof TICKET_STATUSES)[number])
    : 'Open';
};

async function migrate() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');

  const tickets = db.collection('tickets');
  const users = db.collection('users');
  const employees = db.collection('employees');
  const supportConfigs = db.collection('supportconfigs');
  const counters = db.collection('counters');

  let nextSeq = 0;
  const existingNumbers = await tickets
    .find({ ticketNumber: { $exists: true } }, { projection: { ticketNumber: 1 } })
    .toArray();
  for (const row of existingNumbers) {
    const match = /^TKT-(\d+)$/.exec(String(row.ticketNumber));
    if (match) nextSeq = Math.max(nextSeq, Number(match[1]));
  }
  const nextNumber = (current?: string) => {
    if (current) {
      const match = /^TKT-(\d+)$/.exec(current);
      if (match) nextSeq = Math.max(nextSeq, Number(match[1]));
      return current;
    }
    nextSeq += 1;
    return `TKT-${String(nextSeq).padStart(5, '0')}`;
  };

  // 1. Support configuration singleton
  const existingConfig = await supportConfigs.findOne({ key: 'default' });
  if (!existingConfig) {
    await supportConfigs.insertOne({
      key: 'default',
      ticketCategories: DEFAULT_TICKET_CATEGORIES,
      knowledgeCategories: DEFAULT_KNOWLEDGE_CATEGORIES,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✓ Support configuration seeded');
  } else {
    const set: Record<string, unknown> = {};
    if (!existingConfig.ticketCategories?.length) {
      set.ticketCategories = DEFAULT_TICKET_CATEGORIES;
    }
    if (!existingConfig.knowledgeCategories?.length) {
      set.knowledgeCategories = DEFAULT_KNOWLEDGE_CATEGORIES;
    }
    if (Object.keys(set).length > 0) {
      await supportConfigs.updateOne({ key: 'default' }, { $set: set });
      console.log('✓ Support configuration defaults filled in');
    } else {
      console.log('  Support configuration already present');
    }
  }

  // 2. Admin role receives the new support modules, but remains non-technician.
  const adminRole = await Role.findOne({ key: 'admin' });
  if (adminRole) {
    const permissions = new Set<string>(adminRole.permissions ?? []);
    for (const key of ADMIN_PERMISSIONS) permissions.add(key);
    permissions.delete('tickets.manage');
    permissions.delete('tickets.delete');
    await Role.updateOne(
      { key: 'admin' },
      { $set: { permissions: [...permissions].sort() } }
    );
    console.log('✓ Admin role permissions updated');
  } else {
    console.log('  Admin role not found — run seedAccessControl.ts first');
  }

  // 3. Migrate old tickets to the new schema.
  const legacyTickets = await tickets.find({}).toArray();
  let migrated = 0;

  for (const doc of legacyTickets) {
    const submissionDate = doc.submittedDate ?? doc.createdAt ?? new Date();
    const status = normalizeStatus(doc.status);

    const reportedById = doc.reportedBy;
    const employee = reportedById
      ? await employees.findOne({ _id: reportedById }, { projection: { employeeName: 1 } })
      : null;
    const requestedForName =
      doc.requestedForName ?? doc.reportedByName ?? employee?.employeeName ?? 'Unknown';

    let creator = reportedById
      ? await users.findOne({ employeeId: reportedById }, { projection: { _id: 1, name: 1 } })
      : null;
    creator ??= await users.findOne(
      { email: 'admin@itms.local' },
      { projection: { _id: 1, name: 1 } }
    );
    creator ??= await users.findOne({}, { projection: { _id: 1, name: 1 } });

    const createdBy = doc.createdBy ?? creator?._id ?? reportedById;
    const createdByName = doc.createdByName ?? creator?.name ?? requestedForName;

    let statusHistory = Array.isArray(doc.statusHistory) ? doc.statusHistory : [];
    if (statusHistory.length === 0) {
      statusHistory = [{ status: 'Open', at: submissionDate, byName: requestedForName }];
      if (status === 'In Progress') {
        statusHistory.push({
          status: 'In Progress',
          at: doc.startedAt ?? doc.updatedAt ?? submissionDate,
        });
      } else if (status === 'Pending') {
        statusHistory.push({
          status: 'Pending',
          at: doc.updatedAt ?? submissionDate,
        });
      } else if (status === 'Resolved') {
        statusHistory.push({
          status: 'Resolved',
          at: doc.resolvedAt ?? doc.resolutionDate ?? doc.updatedAt ?? submissionDate,
        });
      } else if (status === 'Closed') {
        statusHistory.push({
          status: 'Closed',
          at: doc.closedAt ?? doc.resolutionDate ?? doc.updatedAt ?? submissionDate,
        });
      }
    }

    const resolutionDate = doc.resolutionDate ?? doc.resolvedAt;
    const closedAt =
      status === 'Closed'
        ? doc.closedAt ?? resolutionDate ?? doc.updatedAt ?? submissionDate
        : doc.closedAt;
    const resolvedAt =
      status === 'Resolved'
        ? doc.resolvedAt ?? resolutionDate ?? doc.updatedAt ?? submissionDate
        : status === 'Closed'
          ? doc.resolvedAt ?? resolutionDate
          : doc.resolvedAt;

    const set: Record<string, unknown> = {
      ticketNumber: nextNumber(doc.ticketNumber),
      subject: doc.subject ?? 'Untitled ticket',
      description: doc.description ?? doc.details ?? '',
      type: doc.type ?? 'Incident',
      category: doc.category ?? 'Other',
      status,
      requestedForEmployeeId: doc.requestedForEmployeeId ?? reportedById,
      requestedForUserId: doc.requestedForUserId,
      requestedForName,
      createdBy: createdBy ?? new mongoose.Types.ObjectId(),
      createdByName,
      assignedTechnicianId: doc.assignedTechnicianId,
      assignedTechnicianName: doc.assignedTechnicianName,
      resolvedById: doc.resolvedById,
      resolvedByName: doc.resolvedByName,
      closedById: doc.closedById,
      closedByName: doc.closedByName,
      affectedItemType: doc.affectedItemType ?? 'Other',
      affectedAssetId: doc.affectedAssetId,
      affectedAssetName: doc.affectedAssetName,
      affectedSoftwareId: doc.affectedSoftwareId,
      affectedSoftwareName: doc.affectedSoftwareName,
      affectedItemOther: doc.affectedItemOther ?? 'Not specified',
      submittedDate: submissionDate,
      startedAt:
        doc.startedAt ??
        (status === 'In Progress' ? doc.updatedAt ?? submissionDate : undefined),
      resolvedAt,
      closedAt,
      reopenedCount: doc.reopenedCount ?? 0,
      lastReopenedAt: doc.lastReopenedAt,
      statusHistory,
      updatedAt: doc.updatedAt ?? new Date(),
    };

    // Drop undefined keys so Mongo does not store nulls.
    for (const key of Object.keys(set)) {
      if (set[key] === undefined) delete set[key];
    }

    await tickets.updateOne(
      { _id: doc._id },
      {
        $set: set,
        $unset: {
          reportedBy: '',
          reportedByName: '',
          details: '',
          resolutionDate: '',
        },
      }
    );
    migrated += 1;
  }

  console.log(`✓ Migrated ${migrated} ticket${migrated === 1 ? '' : 's'}`);

  // 4. Seed the ticket counter above the highest number in use.
  const allNumbers = await tickets
    .find({ ticketNumber: { $exists: true } }, { projection: { ticketNumber: 1 } })
    .toArray();
  let maxSeq = 0;
  for (const row of allNumbers) {
    const match = /^TKT-(\d+)$/.exec(String(row.ticketNumber));
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]));
  }
  await counters.updateOne(
    { _id: 'ticket' as never },
    { $set: { seq: maxSeq } },
    { upsert: true }
  );
  console.log(`✓ Ticket counter set to ${maxSeq}`);

  await mongoose.disconnect();
  console.log('\nSupport migration complete.');
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
