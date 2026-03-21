export class Stock {
  readonly name: string;
  readonly priceJpy: number;
  readonly priceUsd: number;
  readonly changePercent: number;

  constructor(params: {
    name: string;
    priceJpyPer100: number;
    priceUsdPer100: number;
    changePercent: number;
  }) {
    this.name = params.name;
    this.priceJpy = params.priceJpyPer100 / 100;
    this.priceUsd = params.priceUsdPer100 / 100;
    this.changePercent = params.changePercent;
  }
}
