const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const result = await db.collection('assets').updateMany(
    { status: 'Pending Delivery' },
    { $set: { status: 'Ordered' } }
  );

  console.log(`Updated ${result.modifiedCount} assets from "Pending Delivery" to "Ordered"`);
  await mongoose.disconnect();
}

migrate().catch(console.error);
