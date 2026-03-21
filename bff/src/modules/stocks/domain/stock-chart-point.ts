export class StockChartPoint {
  readonly date: string;
  readonly priceJpy: number;

  constructor(params: { date: string; priceJpy: number }) {
    this.date = params.date;
    this.priceJpy = params.priceJpy;
  }

  static average(a: StockChartPoint, b: StockChartPoint): StockChartPoint {
    return new StockChartPoint({
      date: a.date,
      priceJpy: (a.priceJpy + b.priceJpy) / 2,
    });
  }
}
