import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StocksController } from './stocks.controller';
import { GetPopularStocksUsecase } from './usecase/get-popular-stocks.usecase';
import { StocksGatewayA } from './gateway/stocks-service-a.gateway';
import { StocksGatewayB } from './gateway/stocks-service-b.gateway';
import { STOCKS_GATEWAY_A_PORT, STOCKS_GATEWAY_B_PORT } from './port/stocks.gateway.port';
import { GetStockChartUsecase } from './usecase/get-stock-chart.usecase';
import { StockChartServiceAGateway } from './gateway/stock-chart-service-a.gateway';
import { StockChartServiceBGateway } from './gateway/stock-chart-service-b.gateway';
import {
  STOCK_CHART_GATEWAY_A_PORT,
  STOCK_CHART_GATEWAY_B_PORT,
} from './port/stock-chart.gateway.port';

@Module({
  imports: [ConfigModule],
  controllers: [StocksController],
  providers: [
    StocksGatewayA,
    StocksGatewayB,
    { provide: STOCKS_GATEWAY_A_PORT, useExisting: StocksGatewayA },
    { provide: STOCKS_GATEWAY_B_PORT, useExisting: StocksGatewayB },
    GetPopularStocksUsecase,
    StockChartServiceAGateway,
    StockChartServiceBGateway,
    {
      provide: STOCK_CHART_GATEWAY_A_PORT,
      useExisting: StockChartServiceAGateway,
    },
    {
      provide: STOCK_CHART_GATEWAY_B_PORT,
      useExisting: StockChartServiceBGateway,
    },
    GetStockChartUsecase,
  ],
})
export class StocksModule {}
