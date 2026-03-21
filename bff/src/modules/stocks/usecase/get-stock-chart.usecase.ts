import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import {
  STOCK_CHART_GATEWAY_A_PORT,
  STOCK_CHART_GATEWAY_B_PORT,
  StockChartGatewayPort,
} from '../port/stock-chart.gateway.port';
import { ChartPeriod } from '../domain/chart-period';
import { StockChartSeries } from '../domain/stock-chart-series';
import { StockChartResponseDto } from '../dto/stock-chart-response.dto';

@Injectable()
export class GetStockChartUsecase {
  constructor(
    @Inject(STOCK_CHART_GATEWAY_A_PORT)
    private readonly gatewayA: StockChartGatewayPort,
    @Inject(STOCK_CHART_GATEWAY_B_PORT)
    private readonly gatewayB: StockChartGatewayPort,
  ) {}

  async execute(name: string, period: string): Promise<StockChartResponseDto> {
    const chartPeriod = ChartPeriod.of(period);
    const { from, to } = chartPeriod.toDateRange();

    const [resultA, resultB] = await Promise.allSettled([
      this.gatewayA.getStockChart(name, from, to),
      this.gatewayB.getStockChart(name, from, to),
    ]);

    const pointsA = resultA.status === 'fulfilled' ? resultA.value : [];
    const pointsB = resultB.status === 'fulfilled' ? resultB.value : [];

    if (pointsA.length === 0 && pointsB.length === 0) {
      throw new InternalServerErrorException('Both stock chart services are unavailable');
    }

    const items = StockChartSeries.merge(pointsA, pointsB);

    return {
      data: {
        name,
        period: chartPeriod.value,
        items: items.map((p) => ({ date: p.date, priceJpy: p.priceJpy })),
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
