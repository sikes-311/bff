import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { StockChartGatewayPort } from '../port/stock-chart.gateway.port';
import { StockChartPoint } from '../domain/stock-chart-point';
import { DownstreamChartPoint } from '../dto/downstream-chart.dto';

@Injectable()
export class StockChartServiceAGateway implements StockChartGatewayPort {
  private readonly axiosInstance: AxiosInstance;
  private readonly logger = new Logger(StockChartServiceAGateway.name);

  constructor(configService: ConfigService) {
    this.axiosInstance = axios.create({
      baseURL: configService.get<string>('services.serviceA.url'),
      timeout: 5000,
    });
  }

  async getStockChart(name: string, from: string, to: string): Promise<StockChartPoint[]> {
    try {
      this.logger.log(`Requesting chart: name=${name}, from=${from}, to=${to}`);
      const response = await this.axiosInstance.get<DownstreamChartPoint[]>(
        `/stocks/${encodeURIComponent(name)}/chart`,
        { params: { from, to } },
      );
      this.logger.log(`Received ${response.data.length} chart points from Service A`);
      return response.data.map(
        (dto) =>
          new StockChartPoint({
            date: dto.date,
            priceJpy: dto.price_jpy,
          }),
      );
    } catch (error) {
      this.logger.error('StockChartServiceAGateway failed', error);
      throw new InternalServerErrorException('Stock chart service A is unavailable');
    }
  }
}
