import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { StockChartServiceBGateway } from './stock-chart-service-b.gateway';
import { DownstreamChartPoint } from '../dto/downstream-chart.dto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StockChartServiceBGateway', () => {
  let gateway: StockChartServiceBGateway;
  let mockAxiosInstance: { get: jest.Mock };

  beforeEach(() => {
    mockAxiosInstance = { get: jest.fn() };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const configService = {
      get: jest.fn().mockReturnValue('http://service-b.example.com'),
    } as unknown as ConfigService;

    gateway = new StockChartServiceBGateway(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStockChart', () => {
    it('正常系: DownstreamChartPoint が StockChartPoint に変換される', async () => {
      // Arrange
      const downstream: DownstreamChartPoint[] = [
        { date: '2025-10-01', price_jpy: 310000 },
        { date: '2025-11-01', price_jpy: 330000 },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: downstream });

      // Act
      const result = await gateway.getStockChart('トヨタ自動車', '2025-10-01', '2026-03-21');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2025-10-01');
      expect(result[0].priceJpy).toBe(310000);
      expect(result[1].date).toBe('2025-11-01');
      expect(result[1].priceJpy).toBe(330000);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/stocks/${encodeURIComponent('トヨタ自動車')}/chart`,
        { params: { from: '2025-10-01', to: '2026-03-21' } },
      );
    });

    it('正常系: 空配列が返された場合は空配列を返す', async () => {
      // Arrange
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      // Act
      const result = await gateway.getStockChart('トヨタ自動車', '2025-10-01', '2026-03-21');

      // Assert
      expect(result).toEqual([]);
    });

    it('異常系: APIエラー時にInternalServerErrorExceptionをスロー', async () => {
      // Arrange
      mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));

      // Act & Assert
      await expect(
        gateway.getStockChart('トヨタ自動車', '2025-10-01', '2026-03-21'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
