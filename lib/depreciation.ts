// Fixed reference date to prevent hydration mismatch
const REFERENCE_DATE = new Date('2025-01-01T00:00:00.000Z').getTime();

/**
 * Calculates the exact remaining value multiplier (0.0 to 1.0)
 * based on the company's custom laptop depreciation rules:
 * - Months 1-35: Continuous reduction at (0.75 / 36) per month
 * - Month 36: Catch-up adjustment to land at exactly 10% (0.10)
 * - Months 37-48: Continuous reduction from 10% to 2.5% at (0.075 / 12) per month
 * - Months 49-60: Continuous reduction from 2.5% to 0% at (0.025 / 12) per month
 */
function getRemainingRatio(monthNumber: number): number {
  if (monthNumber <= 0) return 1.0;
  if (monthNumber >= 60) return 0.0;

  if (monthNumber <= 35) {
    // Phase 1: Months 1 to 35
    const monthlyRate = 0.75 / 36;
    return 1.0 - monthNumber * monthlyRate;
  }

  if (monthNumber === 36) {
    // Phase 2: Month 36 catch-up adjustment to 10% target
    return 0.10;
  }

  if (monthNumber <= 48) {
    // Phase 3: Months 37 to 48 (Year 4 linear drop from 10% to 2.5%)
    const monthsInPhase = monthNumber - 36;
    const monthlyRate = 0.075 / 12;
    return 0.10 - monthsInPhase * monthlyRate;
  }

  // Phase 4: Months 49 to 60 (Year 5 linear drop from 2.5% to 0%)
  const monthsInPhase = monthNumber - 48;
  const monthlyRate = 0.025 / 12;
  return 0.025 - monthsInPhase * monthlyRate;
}

function getStraightLineRatio(monthNumber: number): number {
  if (monthNumber <= 0) return 1.0;
  if (monthNumber >= 60) return 0.0;
  const annualRate = 0.20;
  const monthlyRate = annualRate / 12;
  return Math.max(1.0 - monthNumber * monthlyRate, 0);
}

function getDecliningBalanceRatio(monthNumber: number): number {
  if (monthNumber <= 0) return 1.0;
  if (monthNumber >= 60) return 0.0;
  const annualRate = 0.40;
  const yearsElapsed = Math.floor((monthNumber - 1) / 12);
  const currentYearMonth = ((monthNumber - 1) % 12) + 1;
  const startOfYearValue = Math.pow(1 - annualRate, yearsElapsed);
  const monthlyRate = annualRate / 12;
  return Math.max(startOfYearValue * (1 - monthlyRate * (currentYearMonth - 1)), 0);
}

function getRemainingRatioForMethod(method: string, monthNumber: number): number {
  if (method === 'straight-line') return getStraightLineRatio(monthNumber);
  if (method === 'declining-balance') return getDecliningBalanceRatio(monthNumber);
  return getRemainingRatio(monthNumber);
}

/**
 * Value of an asset at an explicit point in time. Unlike
 * `calculateCurrentValue`, this never falls back to the fixed server
 * reference date, so server-side reporting can use the real current date.
 */
export function calculateValueAtDate(
  acquisitionCost: number,
  acquisitionDate: string,
  method: string = 'custom',
  referenceDate: Date | string | number = new Date(),
  assignedDate?: string
): number {
  const now = new Date(referenceDate).getTime();
  const startDate = method === 'custom' && assignedDate ? assignedDate : acquisitionDate;
  const monthsElapsed = Math.floor(
    (now - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  if (monthsElapsed >= 60) return 0;

  const ratio = getRemainingRatioForMethod(method, monthsElapsed + 1);
  return Math.max(Math.round(acquisitionCost * ratio * 100) / 100, 0);
}

export function calculateCurrentValue(
  acquisitionCost: number,
  acquisitionDate: string,
  method: string = 'custom',
  assignedDate?: string
): number {
  const isServer = typeof window === 'undefined';
  const now = isServer ? REFERENCE_DATE : Date.now();

  return calculateValueAtDate(acquisitionCost, acquisitionDate, method, now, assignedDate);
}

export function isFullyDepreciated(
  acquisitionCost: number,
  acquisitionDate: string,
  method: string = 'custom',
  assignedDate?: string
): boolean {
  return calculateCurrentValue(acquisitionCost, acquisitionDate, method, assignedDate) <= 0;
}

export type DepreciationMonthRow = {
  month: string;
  isCurrent: boolean;
  currentYear: number | null;
  year1: number; year2: number; year3: number; year4: number; year5: number;
};

export function getMonthlyDepreciationSchedule(
  acquisitionCost: number,
  acquisitionDate: string,
  method: string = 'custom',
  assignedDate?: string
): DepreciationMonthRow[] {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const startDate = method === 'custom' && assignedDate ? assignedDate : acquisitionDate;
  const acqDate = new Date(startDate);

  // For custom depreciation, start from the first day of the next month
  const depreciationStartDate = method === 'custom' && assignedDate
    ? new Date(acqDate.getFullYear(), acqDate.getMonth() + 1, 1)
    : acqDate;

  const isServer = typeof window === 'undefined';
  const now = isServer ? REFERENCE_DATE : Date.now();
  const monthsElapsed = Math.floor(
    (now - depreciationStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  const fullyDepreciated = monthsElapsed >= 60;
  const currentYear = fullyDepreciated ? null : Math.min(Math.floor(monthsElapsed / 12) + 1, 5);
  const currentMonthInYear = monthsElapsed % 12;
  const startMonth = depreciationStartDate.getMonth() % 12;

  return Array.from({ length: 12 }, (_, month) => {
    const adjustedMonth = (startMonth + month) % 12;
    const isCurrent = !fullyDepreciated && month === currentMonthInYear;

    const yearValues = [1, 2, 3, 4, 5].map((year) => {
      const monthNumber = (year - 1) * 12 + month + 1;
      const ratio = getRemainingRatioForMethod(method, monthNumber);
      return Math.max(Math.round(acquisitionCost * ratio * 100) / 100, 0);
    });

    return {
      month: MONTHS[adjustedMonth],
      isCurrent,
      currentYear: isCurrent ? currentYear : null,
      year1: yearValues[0], year2: yearValues[1], year3: yearValues[2],
      year4: yearValues[3], year5: yearValues[4],
    };
  });
}