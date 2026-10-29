export type ContractStatus = 'On Going' | 'Fully Paid';

export const DEFAULT_CONTRACT_MONTHS = 24;
export const MAX_CONTRACT_CONTRIBUTION = 30_000;

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
