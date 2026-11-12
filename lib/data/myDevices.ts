import { Types } from 'mongoose';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/models/User';
import { Employee } from '@/models/Employee';
import { Asset } from '@/models/Asset';
import { Contract } from '@/models/Contract';
import { Software } from '@/models/Software';
import {
  computeContractMetrics,
  formatTenure,
  formatTenureShort,
  getEffectiveContractEnd,
  monthsElapsed,
  resolveContractStatus,
} from '@/lib/contracts';
import type { ContractStatus } from '@/lib/contracts';
import type { AssetStatus, AssetType } from '@/models/Asset';
import type { SoftwareCategory, SoftwareLicenseType, SoftwareStatus } from '@/lib/software';

export type MyDevice = {
  _id: string;
  assetCode: string;
  assetName: string;
  assetType: AssetType;
  location: string;
  costCenter?: string;
  status?: AssetStatus;
  acquisitionDate?: string;
  acquisitionCost: number;
  assignedDate?: string;
  depreciationMethod?: string;
  isOnContract: boolean;
};

export type MyContract = {
  _id: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  acquisitionCost: number;
  acquisitionDate?: string;
  depreciationMethod?: string;
  issuedDate: string;
  finishDate: string;
  numberOfMonths: number;
  perCutoff: number;
  perMonth: number;
  totalContribution: number;
  totalPaid: number;
  remaining: number;
  status: ContractStatus;
  tenure: string;
  tenureShort: string;
  contractEnd: string;
  deviceAssignedToUser: boolean;
};

export type MySoftware = {
  _id: string;
  softwareName: string;
  category: SoftwareCategory;
  status: SoftwareStatus;
  licenseType?: SoftwareLicenseType;
  appOwner?: string;
  supportLink?: string;
  renewalDate?: string;
};

export type MyEmployeeProfile = {
  _id: string;
  employeeName: string;
  email?: string;
  department: string;
  userType: string;
  status: string;
};

export type MyDevicesData = {
  employee: MyEmployeeProfile | null;
  devices: MyDevice[];
  contracts: MyContract[];
  software: MySoftware[];
};

/**
 * Everything the signed-in user owns at the company: the devices currently
 * assigned to their employee record, their active contracts, and their
 * assigned software. Read-only — no mutations are exposed here.
 */
export async function getMyDevices(userId: string): Promise<MyDevicesData> {
  await connectDB();

  const empty: MyDevicesData = { employee: null, devices: [], contracts: [], software: [] };
  if (!Types.ObjectId.isValid(userId)) return empty;

  const user = await User.findById(userId).select('employeeId').lean();
  if (!user?.employeeId) return empty;

  const employee = await Employee.findById(user.employeeId).lean();
  if (!employee) return empty;

  const employeeId = employee._id;
  const employeeProfile: MyEmployeeProfile = {
    _id: employeeId.toString(),
    employeeName: employee.employeeName,
    email: employee.email,
    department: employee.department,
    userType: employee.userType,
    status: employee.status,
  };

  const [assetDocs, contractDocs, softwareDocs] = await Promise.all([
    Asset.find({ 'currentAssignment.employeeId': employeeId })
      .sort({ assetType: 1, assetName: 1 })
      .lean(),
    Contract.find({ employeeId, issuedDate: { $exists: true } })
      .sort({ issuedDate: -1 })
      .lean(),
    (employee.softwareIds ?? []).length > 0
      ? Software.find({ _id: { $in: employee.softwareIds } })
          .sort({ softwareName: 1 })
          .lean()
      : Promise.resolve([]),
  ]);

  const now = new Date();

  // Only active contracts belong on this overview. Ended contracts stay in the
  // Contracts module for technicians.
  const activeContracts = contractDocs.filter(
    (contract) => resolveContractStatus(contract.issuedDate, contract.endedAt, now) === 'Active'
  );

  // A contract's device may no longer be assigned to the employee (for example
  // it was returned without ending the contract). Fetch those assets as well so
  // the contract still shows its cost and value schedule.
  const assignedAssetIds = new Set(assetDocs.map((asset) => asset._id.toString()));
  const missingContractAssetIds = activeContracts
    .map((contract) => contract.assetId)
    .filter((assetId) => !!assetId && !assignedAssetIds.has(assetId.toString()));

  const extraAssetDocs =
    missingContractAssetIds.length > 0
      ? await Asset.find({ _id: { $in: missingContractAssetIds } }).lean()
      : [];

  const allAssetDocs = [...assetDocs, ...extraAssetDocs];
  const contractedAssetIds = new Set(
    activeContracts.map((contract) => contract.assetId?.toString()).filter(Boolean)
  );

  const devices: MyDevice[] = assetDocs.map((asset) => ({
    _id: asset._id.toString(),
    assetCode: asset.assetCode,
    assetName: asset.assetName,
    assetType: asset.assetType,
    location: asset.location,
    costCenter: asset.costCenter,
    status: asset.status,
    acquisitionDate: asset.acquisitionDate ? new Date(asset.acquisitionDate).toISOString() : undefined,
    acquisitionCost: asset.acquisitionCost,
    assignedDate: asset.currentAssignment?.assignedDate
      ? new Date(asset.currentAssignment.assignedDate).toISOString()
      : undefined,
    depreciationMethod: asset.depreciationMethod,
    isOnContract: contractedAssetIds.has(asset._id.toString()),
  }));

  const assetMap = new Map(allAssetDocs.map((asset) => [asset._id.toString(), asset]));

  const contracts: MyContract[] = activeContracts.map((contract) => {
    const metrics = computeContractMetrics({
      issuedDate: contract.issuedDate,
      numberOfMonths: contract.numberOfMonths,
      perCutoff: contract.perCutoff,
      totalContribution: contract.totalContribution,
      referenceDate: now,
    });
    const assetId = contract.assetId?.toString() ?? '';
    const asset = assetMap.get(assetId);

    return {
      _id: contract._id.toString(),
      assetId,
      assetName: contract.assetName,
      assetCode: contract.assetCode,
      acquisitionCost: asset?.acquisitionCost ?? 0,
      acquisitionDate: asset?.acquisitionDate
        ? new Date(asset.acquisitionDate).toISOString()
        : undefined,
      depreciationMethod: asset?.depreciationMethod,
      issuedDate: new Date(contract.issuedDate).toISOString(),
      finishDate: metrics.finishDate.toISOString(),
      numberOfMonths: contract.numberOfMonths,
      perCutoff: contract.perCutoff,
      perMonth: metrics.perMonth,
      totalContribution: contract.totalContribution,
      totalPaid: metrics.totalPaid,
      remaining: metrics.remaining,
      status: metrics.status,
      tenure: formatTenure(contract.issuedDate, now),
      tenureShort: formatTenureShort(monthsElapsed(new Date(contract.issuedDate), now)),
      contractEnd: getEffectiveContractEnd(contract.issuedDate).toISOString(),
      deviceAssignedToUser: assignedAssetIds.has(assetId),
    };
  });

  const software: MySoftware[] = softwareDocs.map((item) => ({
    _id: item._id.toString(),
    softwareName: item.softwareName,
    category: item.category,
    status: item.status,
    licenseType: item.licenseType,
    appOwner: item.appOwner,
    supportLink: item.supportLink,
    renewalDate: item.renewalDate ? new Date(item.renewalDate).toISOString() : undefined,
  }));

  return { employee: employeeProfile, devices, contracts, software };
}
