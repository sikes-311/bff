import { BadRequestException } from '@nestjs/common';
import { ChartPeriod } from './chart-period';

describe('ChartPeriod', () => {
  describe('of', () => {
    it.each(['6m', '1y', '2y', '10y'] as const)(
      '正常系: ChartPeriod.of("%s") で正常に生成される',
      (value) => {
        // Act
        const period = ChartPeriod.of(value);

        // Assert
        expect(period.value).toBe(value);
      },
    );

    it('異常系: 無効な値の場合はBadRequestExceptionをスロー', () => {
      // Act & Assert
      expect(() => ChartPeriod.of('invalid')).toThrow(BadRequestException);
    });

    it('異常系: 空文字の場合はBadRequestExceptionをスロー', () => {
      // Act & Assert
      expect(() => ChartPeriod.of('')).toThrow(BadRequestException);
    });
  });

  describe('toDateRange', () => {
    it.each([
      ['6m', 6, 'month'],
      ['1y', 1, 'year'],
      ['2y', 2, 'year'],
      ['10y', 10, 'year'],
    ] as const)(
      '正常系: period=%s で正しいfrom/toが計算される',
      (value, amount, unit) => {
        // Arrange
        const period = ChartPeriod.of(value);
        const now = new Date();

        // Act
        const { from, to } = period.toDateRange();

        // Assert — to は今日の日付
        const expectedTo = formatDate(now);
        expect(to).toBe(expectedTo);

        // from の検証
        const expectedFrom = new Date(now);
        if (unit === 'month') {
          expectedFrom.setMonth(expectedFrom.getMonth() - amount);
        } else {
          expectedFrom.setFullYear(expectedFrom.getFullYear() - amount);
        }
        expect(from).toBe(formatDate(expectedFrom));
      },
    );
  });
});

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
