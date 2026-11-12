import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { Role } from '../models/Role';
import { User } from '../models/User';
import { ROLE_DEFINITIONS, ROLE_ORDER } from '../lib/roles';
import { normalizePermissions } from '../lib/permissions';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI not set in .env.local');

async function seed() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('Connected to MongoDB');

  for (const key of ROLE_ORDER) {
    const definition = ROLE_DEFINITIONS[key];
    const existing = await Role.findOne({ key });

    if (!existing) {
      await Role.create({
        key,
        name: definition.name,
        description: definition.description,
        permissions: normalizePermissions(definition.permissions),
        editable: definition.editable,
      });
      console.log(`✓ Role created: ${definition.name}`);
      continue;
    }

    // Preserve edits to the configurable Admin role; keep fixed roles in sync.
    await Role.updateOne(
      { key },
      {
        $set: {
          name: definition.name,
          description: definition.description,
          editable: definition.editable,
          ...(definition.editable
            ? {}
            : { permissions: normalizePermissions(definition.permissions) }),
        },
      }
    );
    console.log(`  Role exists: ${definition.name}`);
  }

  const admin = await User.findOneAndUpdate(
    { email: 'admin@itms.local' },
    { $set: { roleKey: 'developer', status: 'Active' } },
    { returnDocument: 'after' }
  );
  console.log(admin ? '✓ admin@itms.local → Developer' : '  admin@itms.local not found');

  const defaulted = await User.updateMany(
    { roleKey: { $exists: false } },
    { $set: { roleKey: 'user' } }
  );
  const activated = await User.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'Active' } }
  );
  console.log(`  Defaulted ${defaulted.modifiedCount} users to User role`);
  console.log(`  Defaulted ${activated.modifiedCount} users to Active status`);

  await mongoose.disconnect();
  console.log('\nAccess control seed complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
