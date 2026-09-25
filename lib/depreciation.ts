const YEARLY_RATES: Record<number, number> = {
  1: 0.25,
  2: 0.25,
  3: 0.40,
  4: 0.075,
  5: 0.025,
};

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

export function calculateCurrentValue(acquisitionCost: number, acquisitionDate: string): number {
  // Client-side calculation uses current time, server-side uses fixed reference
  const isServer = typeof window === 'undefined';
  const now = isServer ? REFERENCE_DATE : Date.now();
  const monthsElapsed = Math.floor(
    (now - new Date(acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  if (monthsElapsed >= 60) return 0;

  const monthNumber = monthsElapsed + 1;
  const ratio = getRemainingRatio(monthNumber);

  return Math.max(Math.round(acquisitionCost * ratio * 100) / 100, 0);
}

export function isFullyDepreciated(acquisitionCost: number, acquisitionDate: string): boolean {
  return calculateCurrentValue(acquisitionCost, acquisitionDate) <= 0;
}

export type DepreciationMonthRow = {
  month: string;
  isCurrent: boolean;
  currentYear: number | null;
  year1: number; year2: number; year3: number; year4: number; year5: number;
};

export function getMonthlyDepreciationSchedule(
  acquisitionCost: number,
  acquisitionDate: string
): DepreciationMonthRow[] {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const acqDate = new Date(acquisitionDate);

  // Client-side calculation uses current time, server-side uses fixed reference
  const isServer = typeof window === 'undefined';
  const now = isServer ? REFERENCE_DATE : Date.now();
  const monthsElapsed = Math.floor(
    (now - acqDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  const fullyDepreciated = monthsElapsed >= 60;
  const currentYear = fullyDepreciated ? null : Math.min(Math.floor(monthsElapsed / 12) + 1, 5);
  const currentMonthInYear = monthsElapsed % 12;
  const startMonth = acqDate.getMonth() % 12;

  return Array.from({ length: 12 }, (_, month) => {
    const adjustedMonth = (startMonth + month) % 12;
    const isCurrent = !fullyDepreciated && month === currentMonthInYear;

    const yearValues = [1, 2, 3, 4, 5].map((year) => {
      const monthNumber = (year - 1) * 12 + month + 1;
      const ratio = getRemainingRatio(monthNumber);
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