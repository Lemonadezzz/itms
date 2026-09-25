require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Update existing Resigned and Retired statuses to Inactive
  const result = await mongoose.connection.db.collection('employees').updateMany(
    { status: { $in: ['Resigned', 'Retired'] } },
    { $set: { status: 'Inactive' } }
  );
  
  console.log('Updated', result.modifiedCount, 'employees');
  await mongoose.disconnect();
  console.log('Done');
}).catch(err => {
  console.error(err);
  process.exit(1);
});
