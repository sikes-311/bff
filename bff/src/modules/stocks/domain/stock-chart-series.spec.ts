import { StockChartPoint } from './stock-chart-point';
import { StockChartSeries } from './stock-chart-series';

const point = (date: string, priceJpy: number): StockChartPoint =>
  new StockChartPoint({ date, priceJpy });

describe('StockChartSeries', () => {
  describe('merge', () => {
    it('正常系: 両方に同日付がある場合は平均値になる', () => {
      // Arrange
      const pointsA = [point('2025-10-01', 300000)];
      const pointsB = [point('2025-10-01', 310000)];

      // Act
      const result = StockChartSeries.merge(pointsA, pointsB);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-10-01');
      expect(result[0].priceJpy).toBe(305000);
    });

    it('正常系: 片方のみにある日付はそのまま残る', () => {
      // Arrange
      const pointsA = [point('2025-10-01', 300000)];
      const pointsB = [point('2025-11-01', 330000)];

      // Act
      const result = StockChartSeries.merge(pointsA, pointsB);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2025-10-01', priceJpy: 300000 });
      expect(result[1]).toEqual({ date: '2025-11-01', priceJpy: 330000 });
    });

    it('正常系: 結果が日付昇順でソートされる', () => {
      // Arrange
      const pointsA = [
        point('2025-12-01', 340000),
        point('2025-10-01', 300000),
      ];
      const pointsB = [point('2025-11-01', 330000)];

      // Act
      const result = StockChartSeries.merge(pointsA, pointsB);

      // Assert
      expect(result.map((p) => p.date)).toEqual([
        '2025-10-01',
        '2025-11-01',
        '2025-12-01',
      ]);
    });

    it('正常系: 両方空の場合は空配列を返す', () => {
      // Act
      const result = StockChartSeries.merge([], []);

      // Assert
      expect(result).toEqual([]);
    });

    it('正常系: 複数日付の混合パターンが正しくマージされる', () => {
      // Arrange
      const pointsA = [
        point('2025-10-01', 300000),
        point('2025-11-01', 320000),
        point('2025-12-01', 340000),
      ];
      const pointsB = [
        point('2025-10-01', 310000),
        point('2025-12-01', 350000),
        point('2026-01-01', 360000),
      ];

      // Act
      const result = StockChartSeries.merge(pointsA, pointsB);

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ date: '2025-10-01', priceJpy: 305000 }); // 平均
      expect(result[1]).toEqual({ date: '2025-11-01', priceJpy: 320000 }); // Aのみ
      expect(result[2]).toEqual({ date: '2025-12-01', priceJpy: 345000 }); // 平均
      expect(result[3]).toEqual({ date: '2026-01-01', priceJpy: 360000 }); // Bのみ
    });
  });
});
