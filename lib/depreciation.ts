const YEARLY_RATES: Record<number, number> = {
  1: 0.25,
  2: 0.25,
  3: 0.40,
  4: 0.075,
  5: 0.025,
};

function buildMonthlyRates(): Record<number, number> {
  const rates: Record<number, number> = {};
  let index = 1;
  for (const yearRate of Object.values(YEARLY_RATES)) {
    const monthly = yearRate / 12;
    for (let i = 0; i < 12; i++) rates[index++] = monthly;
  }
  return rates;
}

export function calculateCurrentValue(acquisitionCost: number, acquisitionDate: string): number {
  const monthsElapsed = Math.floor(
    (Date.now() - new Date(acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  if (monthsElapsed >= 60) return 0;

  const rates = buildMonthlyRates();
  const monthNumber = monthsElapsed + 1;
  let totalDepreciation = 0;
  for (let i = 1; i <= monthNumber && i <= 60; i++) totalDepreciation += rates[i] ?? 0;

  return Math.max(Math.round(acquisitionCost * (1 - totalDepreciation) * 100) / 100, 0);
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
  const rates = buildMonthlyRates();
  const acqDate = new Date(acquisitionDate);

  const monthsElapsed = Math.floor(
    (Date.now() - acqDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
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
      let total = 0;
      for (let i = 1; i <= monthNumber && i <= 60; i++) total += rates[i] ?? 0;
      return Math.max(Math.round(acquisitionCost * (1 - total) * 100) / 100, 0);
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
