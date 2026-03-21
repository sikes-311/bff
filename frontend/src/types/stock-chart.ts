export type ChartPeriod = '6m' | '1y' | '2y' | '10y';

export type StockChartPoint = {
  date: string; // YYYY-MM-DD
  priceJpy: number;
};

export type StockChartResponse = {
  data: {
    name: string;
    period: ChartPeriod;
    items: StockChartPoint[];
  };
  meta: { timestamp: string };
};
