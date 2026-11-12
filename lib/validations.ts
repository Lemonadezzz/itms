import { z } from 'zod';
import {
  SOFTWARE_CATEGORIES,
  SOFTWARE_LICENSE_TYPES,
  SOFTWARE_STATUSES,
} from '@/lib/software';

/** Treat empty form values as an omitted optional field. */
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const CreateAssetSchema = z.object({
  assetName:          z.string().min(1),
  assetCode:          z.string().min(1),
  location:           z.string().min(1),
  assetType:          z.enum(['laptop', 'desktop', 'display']),
  costCenter:         z.string().optional(),
  acquisitionDate:    z.coerce.date().optional(),
  issuedDate:         z.coerce.date().optional().or(z.literal('').transform(() => undefined)),
  isPendingDelivery:  z.string().optional(),
  acquisitionCost:    z.coerce.number().positive(),
  supplierId:         z.string().optional(),
  depreciationMethod: z.enum(['straight-line', 'declining-balance', 'custom']).optional().or(z.literal('').transform(() => undefined)),
});

export const AssignAssetSchema = z.object({
  employeeId:   z.string().min(1),
  employeeName: z.string().min(1),
  assignedAt: z.coerce.date(),
  notes:        z.string().optional(),
});

export const CreateEmployeeSchema = z.object({
  employeeName: z.string().min(1),
  email:        z.string().email(),
  departmentId: z.string().min(1, 'Department is required'),
  userType:     z.enum(['support', 'standard', 'standardplus', 'poweruser']),
  status:       z.enum(['Active', 'Inactive']).optional(),
  hiredAt:      z.preprocess(emptyToUndefined, z.coerce.date().optional()),
});

export const CreateContractSchema = z.object({
  employeeId:     z.string().min(1),
  assetId:        z.string().min(1),
  numberOfMonths: z.coerce.number().int().min(1),
});

export const UpdateContractSchema = z.object({
  numberOfMonths: z.coerce.number().int().min(1),
});

export const CreateTicketSchema = z.object({
  subject:        z.string().min(1),
  details:        z.string().optional(),
  reportedBy:     z.string().min(1),
  reportedByName: z.string().min(1),
  status:         z.enum(['Open', 'In-Progress', 'Closed']).default('Open'),
  submittedDate:  z.coerce.date().default(() => new Date()),
  resolutionDate: z.coerce.date().optional(),
});

export const CreateSupplierSchema = z.object({
  supplierName:    z.string().min(1),
  contactPerson:   z.string().optional(),
  email:           z.string().email().optional().or(z.literal('')),
  telephoneNumber: z.string().optional(),
  categories:      z.string().optional(), // comma-separated from form
});

export const CreateDepartmentSchema = z.object({
  departmentName: z.string().trim().min(1, 'Department name is required'),
  description:    z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const CreateSoftwareSchema = z.object({
  softwareName:    z.string().trim().min(1, 'Software name is required'),
  category:        z.enum(SOFTWARE_CATEGORIES),
  status:          z.enum(SOFTWARE_STATUSES).default('Active'),
  appOwner:        z.preprocess(emptyToUndefined, z.string().trim().optional()),
  supportLink:     z.preprocess(emptyToUndefined, z.string().trim().optional()),
  licenseType:     z.preprocess(emptyToUndefined, z.enum(SOFTWARE_LICENSE_TYPES).optional()),
  supplierId:      z.preprocess(emptyToUndefined, z.string().optional()),
  acquisitionDate: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  renewalDate:     z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  acquisitionCost: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
});

export type CreateAssetInput    = z.infer<typeof CreateAssetSchema>;
export type AssignAssetInput    = z.infer<typeof AssignAssetSchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type CreateTicketInput   = z.infer<typeof CreateTicketSchema>;
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type CreateSoftwareInput = z.infer<typeof CreateSoftwareSchema>;
