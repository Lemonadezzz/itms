import { z } from 'zod';
import {
  SOFTWARE_CATEGORIES,
  SOFTWARE_LICENSE_TYPES,
  SOFTWARE_STATUSES,
} from '@/lib/software';
import { AFFECTED_ITEM_TYPES, TICKET_STATUSES, TICKET_TYPES } from '@/lib/support';
import { ROLE_KEYS } from '@/lib/roles';

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
  subject:           z.string().trim().min(1, 'Subject is required'),
  description:       z.string().trim().min(1, 'Description is required'),
  type:              z.enum(TICKET_TYPES),
  category:          z.string().trim().min(1, 'Category is required'),
  requestedFor:      z.string().min(1, 'Requested for is required'),
  affectedItemType:  z.enum(AFFECTED_ITEM_TYPES),
  affectedAssetId:   z.preprocess(emptyToUndefined, z.string().optional()),
  affectedSoftwareId: z.preprocess(emptyToUndefined, z.string().optional()),
  affectedItemOther: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export const UpdateTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

export const AssignTicketSchema = z.object({
  technicianId: z.string().min(1, 'Select a technician'),
});

export const CreateKnowledgeArticleSchema = z.object({
  title:    z.string().trim().min(1, 'Title is required'),
  summary:  z.preprocess(emptyToUndefined, z.string().trim().optional()),
  content:  z.string().trim().min(1, 'Content is required'),
  category: z.string().trim().min(1, 'Category is required'),
  tags:     z.preprocess(emptyToUndefined, z.string().optional()),
  status:   z.enum(['Draft', 'Published']),
});

export const UpdateKnowledgeArticleSchema = CreateKnowledgeArticleSchema;

export const UpsertTicketCategorySchema = z.object({
  key:       z.preprocess(emptyToUndefined, z.string().optional()),
  label:     z.string().trim().min(1, 'Category name is required'),
  appliesTo: z.enum(['Incident', 'Service Request', 'Both']),
  active:    z.boolean().optional(),
});

export const UpsertKnowledgeCategorySchema = z.object({
  key:    z.preprocess(emptyToUndefined, z.string().optional()),
  label:  z.string().trim().min(1, 'Category name is required'),
  active: z.boolean().optional(),
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

export const CreateAccountSchema = z.object({
  employeeId: z.preprocess(emptyToUndefined, z.string().optional()),
  name:       z.string().trim().min(1, 'Name is required'),
  email:      z.string().email('Enter a valid email address'),
  password:   z.string().min(8, 'Password must be at least 8 characters'),
  roleKey:    z.enum(ROLE_KEYS),
});

export const UpdateAccountSchema = z.object({
  roleKey:  z.enum(ROLE_KEYS),
  status:   z.enum(['Active', 'Inactive']),
  password: z.preprocess(emptyToUndefined, z.string().min(8, 'Password must be at least 8 characters').optional()),
});

export const UpdateRolePermissionsSchema = z.object({
  roleKey:     z.enum(ROLE_KEYS),
  permissions: z.array(z.string()),
});

export type CreateAssetInput    = z.infer<typeof CreateAssetSchema>;
export type AssignAssetInput    = z.infer<typeof AssignAssetSchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type CreateTicketInput   = z.infer<typeof CreateTicketSchema>;
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type CreateSoftwareInput = z.infer<typeof CreateSoftwareSchema>;
