import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import {
  STOCKS_GATEWAY_A_PORT,
  STOCKS_GATEWAY_B_PORT,
  StocksGatewayPort,
} from '../port/stocks.gateway.port';
import { Stock } from '../domain/stock';
import { PopularStocksResponseDto, StockRateDto } from '../dto/stock-response.dto';

@Injectable()
export class GetPopularStocksUsecase {
  constructor(
    @Inject(STOCKS_GATEWAY_A_PORT)
    private readonly gatewayA: StocksGatewayPort,
    @Inject(STOCKS_GATEWAY_B_PORT)
    private readonly gatewayB: StocksGatewayPort,
  ) {}

  async execute(): Promise<PopularStocksResponseDto> {
    const [resultA, resultB] = await Promise.allSettled([
      this.gatewayA.getPopularStocks(5),
      this.gatewayB.getPopularStocks(5),
    ]);

    const stocksA = resultA.status === 'fulfilled' ? resultA.value : [];
    const stocksB = resultB.status === 'fulfilled' ? resultB.value : [];

    if (stocksA.length === 0 && stocksB.length === 0) {
      throw new InternalServerErrorException('Both stock services are unavailable');
    }

    const merged = this.mergeAndAverage(stocksA, stocksB);

    const data: StockRateDto[] = merged.map((stock) => ({
      name: stock.name,
      priceJpy: stock.priceJpy * 100,
      priceUsd: stock.priceUsd * 100,
      changePercent: stock.changePercent,
    }));

    return {
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  private mergeAndAverage(stocksA: Stock[], stocksB: Stock[]): Stock[] {
    const mapB = new Map(stocksB.map((s) => [s.name, s]));
    const result: Stock[] = [];

    for (const stockA of stocksA) {
      const stockB = mapB.get(stockA.name);
      if (stockB) {
        result.push(
          new Stock({
            name: stockA.name,
            priceJpyPer100: ((stockA.priceJpy + stockB.priceJpy) * 100) / 2,
            priceUsdPer100: ((stockA.priceUsd + stockB.priceUsd) * 100) / 2,
            changePercent: (stockA.changePercent + stockB.changePercent) / 2,
          }),
        );
        mapB.delete(stockA.name);
      } else {
        result.push(stockA);
      }
    }

    for (const stockB of mapB.values()) {
      result.push(stockB);
    }

    return result;
  }
}
