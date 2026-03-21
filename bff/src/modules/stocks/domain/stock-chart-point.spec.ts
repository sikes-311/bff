import { StockChartPoint } from './stock-chart-point';

describe('StockChartPoint', () => {
  describe('average', () => {
    it('正常系: 2点の平均値が正しく計算される', () => {
      // Arrange
      const a = new StockChartPoint({ date: '2025-10-01', priceJpy: 300000 });
      const b = new StockChartPoint({ date: '2025-10-01', priceJpy: 310000 });

      // Act
      const result = StockChartPoint.average(a, b);

      // Assert
      expect(result.date).toBe('2025-10-01');
      expect(result.priceJpy).toBe(305000);
    });

    it('正常系: 同じ値同士の平均はその値になる', () => {
      // Arrange
      const a = new StockChartPoint({ date: '2025-10-01', priceJpy: 200000 });
      const b = new StockChartPoint({ date: '2025-10-01', priceJpy: 200000 });

      // Act
      const result = StockChartPoint.average(a, b);

      // Assert
      expect(result.priceJpy).toBe(200000);
    });
  });
});
