require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  const db = mongoose.connection.db;
  const employees = db.collection('employees');
  const departments = db.collection('departments');

  // Only migrate employees that have a department name but no relationship yet.
  const pending = await employees
    .find(
      { department: { $type: 'string' }, departmentId: { $exists: false } },
      { projection: { department: 1 } }
    )
    .toArray();

  const names = [...new Set(pending.map((e) => (e.department || '').trim()).filter(Boolean))];
  console.log(`Found ${pending.length} employees across ${names.length} department names`);

  let created = 0;
  let linked = 0;

  for (const name of names) {
    let dept = await departments.findOne({ departmentName: name });
    if (!dept) {
      const now = new Date();
      const result = await departments.insertOne({
        departmentName: name,
        createdAt: now,
        updatedAt: now,
      });
      dept = { _id: result.insertedId };
      created += 1;
    }

    const update = await employees.updateMany(
      { department: name, departmentId: { $exists: false } },
      { $set: { departmentId: dept._id } }
    );
    linked += update.modifiedCount;
  }

  console.log(`Created ${created} departments, linked ${linked} employees`);
  await mongoose.disconnect();
  console.log('Done');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
