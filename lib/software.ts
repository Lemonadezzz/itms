export const SOFTWARE_CATEGORIES = [
  'Commercial / Paid License',
  'Internal / In-house App',
  'Free / Enterprise Utility',
  'SaaS Subscription',
] as const;

export type SoftwareCategory = (typeof SOFTWARE_CATEGORIES)[number];

export const SOFTWARE_STATUSES = [
  'Active',
  'Deprecated / Legacy',
  'In Development',
  'Under Review',
] as const;

export type SoftwareStatus = (typeof SOFTWARE_STATUSES)[number];

export const SOFTWARE_LICENSE_TYPES = [
  'Perpetual',
  'Per User / Monthly',
  'Per Seat / Yearly',
  'N/A (Internal/Free)',
] as const;

export type SoftwareLicenseType = (typeof SOFTWARE_LICENSE_TYPES)[number];
