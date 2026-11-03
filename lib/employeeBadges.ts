export type EmployeeContractBadge = 'None' | 'Eligible' | 'Active';

export const EMPLOYEE_CONTRACT_BADGE_COLORS: Record<
  EmployeeContractBadge,
  'default' | 'info' | 'success'
> = {
  None: 'default',
  Eligible: 'info',
  Active: 'success',
};
