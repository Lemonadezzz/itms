export type AssetAssignmentHistory = {
  employeeName: string;
  assignedDate: string;
  returnedDate?: string;
  notes?: string;
};

export type AssetRow = {
  _id: string;
  assetCode: string;
  assetName: string;
  assetType: 'laptop' | 'desktop' | 'display';
  location: string;
  acquisitionDate: string;
  acquisitionCost: number;
  ageInMonths: number;
  assignedTo?: string;
  isAssigned: boolean;
  depreciationMethod?: string;
  assignmentHistory: AssetAssignmentHistory[];
};

export type PaginationParams = {
  page: number;
  pageSize: 50 | 75 | 100;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
