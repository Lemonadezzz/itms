import { z } from 'zod';

export const CreateAssetSchema = z.object({
  assetName:          z.string().min(1),
  assetCode:          z.string().min(1),
  location:           z.string().min(1),
  assetType:          z.enum(['laptop', 'desktop', 'display']),
  acquisitionDate:    z.coerce.date(),
  acquisitionCost:    z.coerce.number().positive(),
  supplierId:         z.string().optional(),
  depreciationMethod: z.enum(['straight-line', 'declining-balance', 'custom']).optional().or(z.literal('').transform(() => undefined)),
});

export const AssignAssetSchema = z.object({
  employeeId:   z.string().min(1),
  employeeName: z.string().min(1),
  assignedDate: z.coerce.date(),
  notes:        z.string().optional(),
});

export const CreateEmployeeSchema = z.object({
  employeeName: z.string().min(1),
  department:   z.string().min(1),
  userType:     z.enum(['support', 'standard', 'standardplus', 'poweruser']),
  location:     z.string().min(1),
  hireDate:     z.coerce.date().optional(),
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

export const CreateSoftwareSchema = z.object({
  softwareName:    z.string().min(1),
  acquisitionDate: z.coerce.date(),
  licenseType:     z.enum(['monthly', 'annually', '3_years', 'perpetual']),
  supplierId:      z.string().optional(),
  acquisitionCost: z.coerce.number().min(0),
  monthlyCost:     z.coerce.number().min(0).optional(),
});

export type CreateAssetInput    = z.infer<typeof CreateAssetSchema>;
export type AssignAssetInput    = z.infer<typeof AssignAssetSchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type CreateTicketInput   = z.infer<typeof CreateTicketSchema>;
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type CreateSoftwareInput = z.infer<typeof CreateSoftwareSchema>;
