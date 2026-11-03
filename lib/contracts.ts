export type ContractStatus = 'On Going' | 'Fully Paid';
export type ContractLifecycleStatus = 'Active' | 'Ended';

export const DEFAULT_CONTRACT_MONTHS = 24;
export const MAX_CONTRACT_CONTRIBUTION = 30_000;
export const CONTRACT_TERM_YEARS = 5;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * The employee's total contribution is 30% of the laptop's acquisition cost,
 * capped at ₱30,000.
 */
export function computeTotalContribution(acquisitionCost: number): number {
  const thirtyPercent = Math.max(0, acquisitionCost) * 0.3;
  return roundMoney(Math.min(thirtyPercent, MAX_CONTRACT_CONTRIBUTION));
}

/** Per-month share of the total contribution. */
export function computePerMonth(totalContribution: number, numberOfMonths: number): number {
  if (numberOfMonths <= 0) return 0;
  return totalContribution / numberOfMonths;
}

/**
 * Per-cutoff share (half of the monthly share). Kept unrounded so the full
 * term adds up exactly to the total contribution; the UI formats to currency.
 */
export function computePerCutoff(totalContribution: number, numberOfMonths: number): number {
  if (numberOfMonths <= 0) return 0;
  return totalContribution / (numberOfMonths * 2);
}

/** Add a number of months to a date, clamping the day to the target month. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return d;
}

/** Add a number of years to a date, clamping the day to the target month. */
export function addYears(date: Date, years: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return d;
}

/** Tenure since the issued date, e.g. "2yrs. 3months". */
export function formatTenure(issuedDate: Date | string, referenceDate: Date = new Date()): string {
  const months = monthsElapsed(new Date(issuedDate), referenceDate);
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return `${years}yr${years === 1 ? '' : 's'}. ${remainder}month${remainder === 1 ? '' : 's'}`;
}

/** Short tenure label, e.g. "4yrs 3mos", "1yr 1mo". */
export function formatTenureShort(months: number): string {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  const yrStr = years > 0 ? `${years}yr${years > 1 ? 's' : ''}` : '';
  const moStr = remainder > 0 ? `${remainder}mo${remainder > 1 ? 's' : ''}` : '';
  return [yrStr, moStr].filter(Boolean).join(' ') || '0mos';
}

/** The contract ends 5 years after the laptop was issued. */
export function getContractEnd(issuedDate: Date | string): Date {
  return addYears(new Date(issuedDate), CONTRACT_TERM_YEARS);
}

/** Active until the 5-year contract end date, then Ended. */
export function getContractLifecycleStatus(
  issuedDate: Date | string,
  referenceDate: Date = new Date()
): ContractLifecycleStatus {
  return referenceDate.getTime() >= getContractEnd(issuedDate).getTime() ? 'Ended' : 'Active';
}

/**
 * The date the contract actually ends: the early end date when a contract was
 * ended manually, otherwise the default 5-year contract end.
 */
export function getEffectiveContractEnd(
  issuedDate: Date | string,
  endedAt?: Date | string | null
): Date {
  return endedAt ? new Date(endedAt) : getContractEnd(issuedDate);
}

/** Contract status, taking an early end into account. */
export function resolveContractStatus(
  issuedDate: Date | string,
  endedAt?: Date | string | null,
  referenceDate: Date = new Date()
): ContractLifecycleStatus {
  if (endedAt) return 'Ended';
  return getContractLifecycleStatus(issuedDate, referenceDate);
}

/** Whole months elapsed between two dates. */
export function monthsElapsed(from: Date, to: Date): number {
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export type ContractMetrics = {
  perMonth: number;
  finishDate: Date;
  totalPaid: number;
  remaining: number;
  status: ContractStatus;
};

export function computeContractMetrics({
  issuedDate,
  numberOfMonths,
  perCutoff,
  totalContribution,
  referenceDate = new Date(),
}: {
  issuedDate: Date | string;
  numberOfMonths: number;
  perCutoff: number;
  totalContribution: number;
  referenceDate?: Date;
}): ContractMetrics {
  const issued = new Date(issuedDate);
  const perMonth = perCutoff * 2;
  const finishDate = addMonths(issued, numberOfMonths);

  // A contract cannot be paid past its full term.
  const paidMonths = Math.min(monthsElapsed(issued, referenceDate), numberOfMonths);
  const totalPaid = paidMonths * perMonth;
  const remaining = Math.max(0, totalContribution - totalPaid);
  // Status reflects payment progress, not the contract term. Use a cent-level
  // tolerance so floating-point rounding never leaves a paid contract "On Going".
  const status: ContractStatus = totalPaid + 0.005 >= totalContribution ? 'Fully Paid' : 'On Going';

  return { perMonth, finishDate, totalPaid, remaining, status };
}
