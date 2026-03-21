export type StockRate = {
  name: string;
  priceJpy: number;
  priceUsd: number;
  changePercent: number;
};

export type PopularStocksResponse = {
  data: StockRate[];
  meta: { timestamp: string };
};
