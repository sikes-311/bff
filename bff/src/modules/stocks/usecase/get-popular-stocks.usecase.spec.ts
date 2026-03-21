import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { GetPopularStocksUsecase } from './get-popular-stocks.usecase';
import {
  STOCKS_GATEWAY_A_PORT,
  STOCKS_GATEWAY_B_PORT,
  StocksGatewayPort,
} from '../port/stocks.gateway.port';
import { Stock } from '../domain/stock';

const createStock = (
  name: string,
  priceJpyPer100: number,
  priceUsdPer100: number,
  changePercent: number,
): Stock => new Stock({ name, priceJpyPer100, priceUsdPer100, changePercent });

describe('GetPopularStocksUsecase', () => {
  let usecase: GetPopularStocksUsecase;
  let gatewayA: jest.Mocked<StocksGatewayPort>;
  let gatewayB: jest.Mocked<StocksGatewayPort>;

  beforeEach(async () => {
    gatewayA = { getPopularStocks: jest.fn() };
    gatewayB = { getPopularStocks: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPopularStocksUsecase,
        { provide: STOCKS_GATEWAY_A_PORT, useValue: gatewayA },
        { provide: STOCKS_GATEWAY_B_PORT, useValue: gatewayB },
      ],
    }).compile();

    usecase = module.get<GetPopularStocksUsecase>(GetPopularStocksUsecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('正常系: 両システムに存在する銘柄は平均値になる', async () => {
      // Arrange
      const stockA = createStock('AAPL', 350000, 2400, 1.0);
      const stockB = createStock('AAPL', 360000, 2600, 3.0);

      gatewayA.getPopularStocks.mockResolvedValue([stockA]);
      gatewayB.getPopularStocks.mockResolvedValue([stockB]);

      // Act
      const result = await usecase.execute();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'AAPL',
        priceJpy: 355000,
        priceUsd: 2500,
        changePercent: 2.0,
      });
    });

    it('正常系: 片方のみに存在する銘柄はその値がそのまま使われる', async () => {
      // Arrange
      const stockA = createStock('AAPL', 350000, 2400, 1.0);
      const stockB = createStock('GOOG', 200000, 1500, -0.5);

      gatewayA.getPopularStocks.mockResolvedValue([stockA]);
      gatewayB.getPopularStocks.mockResolvedValue([stockB]);

      // Act
      const result = await usecase.execute();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'AAPL',
        priceJpy: 350000,
        priceUsd: 2400,
        changePercent: 1.0,
      });
      expect(result[1]).toEqual({
        name: 'GOOG',
        priceJpy: 200000,
        priceUsd: 1500,
        changePercent: -0.5,
      });
    });

    it('正常系: GatewayA と GatewayB を並列で呼び出す（Promise.allSettled）', async () => {
      // Arrange
      gatewayA.getPopularStocks.mockResolvedValue([]);
      gatewayB.getPopularStocks.mockResolvedValue([createStock('AAPL', 350000, 2400, 1.0)]);

      // Act
      await usecase.execute();

      // Assert
      expect(gatewayA.getPopularStocks).toHaveBeenCalledWith(5);
      expect(gatewayB.getPopularStocks).toHaveBeenCalledWith(5);
    });

    it('異常系: 両 Gateway がエラーの場合は InternalServerErrorException を throw する', async () => {
      // Arrange
      gatewayA.getPopularStocks.mockRejectedValue(new Error('Service A down'));
      gatewayB.getPopularStocks.mockRejectedValue(new Error('Service B down'));

      // Act & Assert
      await expect(usecase.execute()).rejects.toThrow(InternalServerErrorException);
    });

    it('正常系: 片方のみエラーの場合は残りの結果を使用する', async () => {
      // Arrange
      const stock = createStock('AAPL', 350000, 2400, 1.0);
      gatewayA.getPopularStocks.mockRejectedValue(new Error('Service A down'));
      gatewayB.getPopularStocks.mockResolvedValue([stock]);

      // Act
      const result = await usecase.execute();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('AAPL');
    });

    it('正常系: GatewayBのみエラーの場合もGatewayAの結果を使用する', async () => {
      // Arrange
      const stock = createStock('GOOG', 200000, 1500, -0.5);
      gatewayA.getPopularStocks.mockResolvedValue([stock]);
      gatewayB.getPopularStocks.mockRejectedValue(new Error('Service B down'));

      // Act
      const result = await usecase.execute();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('GOOG');
    });
  });
});
