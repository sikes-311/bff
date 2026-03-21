import { Stock } from './stock';

describe('Stock', () => {
  describe('constructor', () => {
    it('正常系: priceJpyPer100 と priceUsdPer100 を100で割った値が設定される', () => {
      // Arrange & Act
      const stock = new Stock({
        name: 'AAPL',
        priceJpyPer100: 350000,
        priceUsdPer100: 2400,
        changePercent: 1.5,
      });

      // Assert
      expect(stock.name).toBe('AAPL');
      expect(stock.priceJpy).toBe(3500);
      expect(stock.priceUsd).toBe(24);
      expect(stock.changePercent).toBe(1.5);
    });

    it('正常系: 小数値でも正しく100分の1に変換される', () => {
      // Arrange & Act
      const stock = new Stock({
        name: 'GOOG',
        priceJpyPer100: 12345,
        priceUsdPer100: 99,
        changePercent: -0.5,
      });

      // Assert
      expect(stock.priceJpy).toBe(123.45);
      expect(stock.priceUsd).toBe(0.99);
      expect(stock.changePercent).toBe(-0.5);
    });

    it('正常系: 0の場合も正しく設定される', () => {
      // Arrange & Act
      const stock = new Stock({
        name: 'ZERO',
        priceJpyPer100: 0,
        priceUsdPer100: 0,
        changePercent: 0,
      });

      // Assert
      expect(stock.priceJpy).toBe(0);
      expect(stock.priceUsd).toBe(0);
      expect(stock.changePercent).toBe(0);
    });
  });
});
