import { BadRequestException } from '@nestjs/common';

export class ChartPeriod {
  static readonly VALID = ['6m', '1y', '2y', '10y'] as const;

  private constructor(readonly value: '6m' | '1y' | '2y' | '10y') {}

  static of(value: string): ChartPeriod {
    if (!(ChartPeriod.VALID as readonly string[]).includes(value)) {
      throw new BadRequestException(
        `Invalid period: ${value}. Valid values: ${ChartPeriod.VALID.join(', ')}`,
      );
    }
    return new ChartPeriod(value as '6m' | '1y' | '2y' | '10y');
  }

  toDateRange(): { from: string; to: string } {
    const now = new Date();
    const fromDate = new Date(now);
    switch (this.value) {
      case '6m':
        fromDate.setMonth(fromDate.getMonth() - 6);
        break;
      case '1y':
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        break;
      case '2y':
        fromDate.setFullYear(fromDate.getFullYear() - 2);
        break;
      case '10y':
        fromDate.setFullYear(fromDate.getFullYear() - 10);
        break;
    }
    return { from: formatDate(fromDate), to: formatDate(now) };
  }
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
