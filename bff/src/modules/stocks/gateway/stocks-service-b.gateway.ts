import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { StocksGatewayPort } from '../port/stocks.gateway.port';
import { Stock } from '../domain/stock';
import { DownstreamStockRate } from '../dto/downstream-stock.dto';

@Injectable()
export class StocksGatewayB implements StocksGatewayPort {
  private readonly axiosInstance: AxiosInstance;
  private readonly logger = new Logger(StocksGatewayB.name);

  constructor(configService: ConfigService) {
    this.axiosInstance = axios.create({
      baseURL: configService.get<string>('services.serviceB.url'),
      timeout: 5000,
    });
  }

  async getPopularStocks(limit: number): Promise<Stock[]> {
    try {
      const response = await this.axiosInstance.get<DownstreamStockRate[]>('/stocks/popular', {
        params: { limit },
      });
      return response.data.map(
        (dto) =>
          new Stock({
            name: dto.stockname,
            priceJpyPer100: dto.price_jpy,
            priceUsdPer100: dto.price_usd,
            changePercent: dto.changePercent,
          }),
      );
    } catch (error) {
      this.logger.error('StocksGatewayB failed', error);
      throw new InternalServerErrorException('Stock service B is unavailable');
    }
  }
}
