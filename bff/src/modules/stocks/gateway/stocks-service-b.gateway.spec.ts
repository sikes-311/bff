import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { StocksGatewayB } from './stocks-service-b.gateway';
import { DownstreamStockRate } from '../dto/downstream-stock.dto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StocksGatewayB', () => {
  let gateway: StocksGatewayB;
  let mockAxiosInstance: { get: jest.Mock };

  beforeEach(() => {
    mockAxiosInstance = { get: jest.fn() };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const configService = {
      get: jest.fn().mockReturnValue('http://service-b.example.com'),
    } as unknown as ConfigService;

    gateway = new StocksGatewayB(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPopularStocks', () => {
    it('正常系: DownstreamStockRate が Stock に変換される', async () => {
      // Arrange
      const downstream: DownstreamStockRate[] = [
        { stockname: 'AAPL', price_jpy: 350000, price_usd: 2400, changePercent: 1.5 },
        { stockname: 'GOOG', price_jpy: 200000, price_usd: 1500, changePercent: -0.5 },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: downstream });

      // Act
      const result = await gateway.getPopularStocks(5);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('AAPL');
      expect(result[0].priceJpy).toBe(3500);
      expect(result[0].priceUsd).toBe(24);
      expect(result[0].changePercent).toBe(1.5);
      expect(result[1].name).toBe('GOOG');
      expect(result[1].priceJpy).toBe(2000);
      expect(result[1].priceUsd).toBe(15);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/stocks/popular', {
        params: { limit: 5 },
      });
    });

    it('正常系: price_jpy / price_usd が100分の1になる（100株→1株変換）', async () => {
      // Arrange
      const downstream: DownstreamStockRate[] = [
        { stockname: 'TSLA', price_jpy: 12345, price_usd: 6789, changePercent: 2.0 },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: downstream });

      // Act
      const result = await gateway.getPopularStocks(1);

      // Assert
      expect(result[0].priceJpy).toBe(123.45);
      expect(result[0].priceUsd).toBe(67.89);
    });

    it('異常系: APIエラー時に InternalServerErrorException を throw する', async () => {
      // Arrange
      mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));

      // Act & Assert
      await expect(gateway.getPopularStocks(5)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
