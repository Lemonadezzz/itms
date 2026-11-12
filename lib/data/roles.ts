import { connectDB } from '@/lib/db/mongoose';
import { Role } from '@/models/Role';
import { User } from '@/models/User';
import { ROLE_DEFINITIONS, ROLE_ORDER } from '@/lib/roles';
import { normalizePermissions } from '@/lib/permissions';

export type RoleRow = {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  editable: boolean;
  userCount: number;
};

export async function getRoles(): Promise<RoleRow[]> {
  await connectDB();

  const [docs, counts] = await Promise.all([
    Role.find({}).lean(),
    User.aggregate([{ $group: { _id: '$roleKey', count: { $sum: 1 } } }]),
  ]);

  const countMap = new Map<string, number>(
    counts.map((c) => [String(c._id ?? 'user'), c.count as number])
  );
  const docMap = new Map(docs.map((d) => [d.key, d]));

  return ROLE_ORDER.map((key) => {
    const def = ROLE_DEFINITIONS[key];
    const doc = docMap.get(key);
    return {
      key,
      name: doc?.name ?? def.name,
      description: doc?.description ?? def.description,
      permissions: normalizePermissions(doc?.permissions ?? def.permissions),
      editable: doc?.editable ?? def.editable,
      userCount: countMap.get(key) ?? 0,
    };
  });
}

export async function getRolePermissions(key: string): Promise<string[]> {
  await connectDB();
  const doc = await Role.findOne({ key }).lean();
  const def = ROLE_DEFINITIONS[key as keyof typeof ROLE_DEFINITIONS] ?? ROLE_DEFINITIONS.user;
  return normalizePermissions(doc?.permissions ?? def.permissions);
}
