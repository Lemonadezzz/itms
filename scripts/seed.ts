import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI not set in .env.local');

// ── Inline schemas (avoid Next.js module resolution in plain Node) ──────────

const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
}, { timestamps: true });

const EmployeeSchema = new mongoose.Schema({
  employeeName: String, department: String,
  userType: String, location: String, hireDate: Date,
}, { timestamps: true });

const SupplierSchema = new mongoose.Schema({
  supplierName: String, contactPerson: String,
  email: String, telephoneNumber: String, categories: [String],
}, { timestamps: true });

const AssetSchema = new mongoose.Schema({
  assetName: String, assetCode: { type: String, unique: true },
  location: String, assetType: String,
  acquisitionDate: Date, acquisitionCost: Number,
  supplierId: mongoose.Schema.Types.ObjectId,
  depreciationMethod: String,
  currentAssignment: {
    employeeId: mongoose.Schema.Types.ObjectId,
    assignedDate: Date, notes: String,
  },
  assignmentHistory: [{
    employeeId: mongoose.Schema.Types.ObjectId,
    employeeName: String, assignedDate: Date,
    returnedDate: Date, notes: String,
    _id: false,
  }],
}, { timestamps: true });

const User     = mongoose.models.User     ?? mongoose.model('User',     UserSchema);
const Employee = mongoose.models.Employee ?? mongoose.model('Employee', EmployeeSchema);
const Supplier = mongoose.models.Supplier ?? mongoose.model('Supplier', SupplierSchema);
const Asset    = mongoose.models.Asset    ?? mongoose.model('Asset',    AssetSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Admin user
  const existing = await User.findOne({ email: 'admin@itms.local' });
  if (!existing) {
    const hash = await bcrypt.hash('Admin@1234', 12);
    await User.create({ name: 'Administrator', email: 'admin@itms.local', password: hash });
    console.log('✓ Admin user created  →  admin@itms.local / Admin@1234');
  } else {
    console.log('  Admin user already exists, skipping.');
  }

  // Suppliers
  const supplierCount = await Supplier.countDocuments();
  let supplier1Id: mongoose.Types.ObjectId;
  if (supplierCount === 0) {
    const [s1, s2] = await Supplier.insertMany([
      { supplierName: 'TechSource PH',  contactPerson: 'Juan dela Cruz', email: 'sales@techsource.ph',  telephoneNumber: '02-8123-4567', categories: ['Hardware', 'Networking'] },
      { supplierName: 'SoftVault Inc.', contactPerson: 'Maria Santos',   email: 'info@softvault.com',   telephoneNumber: '02-8765-4321', categories: ['Software', 'Licensing'] },
    ]);
    supplier1Id = s1._id as mongoose.Types.ObjectId;
    console.log('✓ 2 suppliers created');
  } else {
    const s = await Supplier.findOne();
    supplier1Id = s!._id as mongoose.Types.ObjectId;
    console.log('  Suppliers already exist, skipping.');
  }

  // Employees
  const empCount = await Employee.countDocuments();
  let emp1Id: mongoose.Types.ObjectId;
  if (empCount === 0) {
    const [e1, e2, e3] = await Employee.insertMany([
      { employeeName: 'Alice Reyes',   department: 'IT',          userType: 'poweruser',   location: 'HQ',    hireDate: new Date('2021-03-15') },
      { employeeName: 'Bob Mendoza',   department: 'Finance',     userType: 'standard',    location: 'HQ',    hireDate: new Date('2022-07-01') },
      { employeeName: 'Carol Lim',     department: 'Operations',  userType: 'standardplus', location: 'Branch', hireDate: new Date('2020-11-20') },
    ]);
    emp1Id = e1._id as mongoose.Types.ObjectId;
    console.log('✓ 3 employees created');
  } else {
    const e = await Employee.findOne();
    emp1Id = e!._id as mongoose.Types.ObjectId;
    console.log('  Employees already exist, skipping.');
  }

  // Assets
  const assetCount = await Asset.countDocuments();
  if (assetCount === 0) {
    await Asset.insertMany([
      {
        assetName: 'Dell Latitude 5540', assetCode: 'LT-0001', location: 'HQ',
        assetType: 'laptop', acquisitionDate: new Date('2022-06-01'),
        acquisitionCost: 65000, supplierId: supplier1Id,
        depreciationMethod: 'straight-line',
        currentAssignment: { employeeId: emp1Id, assignedDate: new Date('2022-06-15') },
        assignmentHistory: [{ employeeId: emp1Id, employeeName: 'Alice Reyes', assignedDate: new Date('2022-06-15') }],
      },
      {
        assetName: 'HP EliteDesk 800 G6', assetCode: 'DT-0001', location: 'HQ',
        assetType: 'desktop', acquisitionDate: new Date('2021-01-10'),
        acquisitionCost: 45000, supplierId: supplier1Id,
        depreciationMethod: 'straight-line',
      },
      {
        assetName: 'LG 27" 4K Monitor', assetCode: 'DP-0001', location: 'Branch',
        assetType: 'display', acquisitionDate: new Date('2023-03-20'),
        acquisitionCost: 22000, supplierId: supplier1Id,
        depreciationMethod: 'straight-line',
      },
      {
        assetName: 'Lenovo ThinkPad X1', assetCode: 'LT-0002', location: 'Branch',
        assetType: 'laptop', acquisitionDate: new Date('2020-08-05'),
        acquisitionCost: 72000, supplierId: supplier1Id,
        depreciationMethod: 'declining-balance',
      },
    ]);
    console.log('✓ 4 assets created');
  } else {
    console.log('  Assets already exist, skipping.');
  }

  await mongoose.disconnect();
  console.log('\nSeed complete.');
}

seed().catch((err) => { console.error(err); process.exit(1); });
