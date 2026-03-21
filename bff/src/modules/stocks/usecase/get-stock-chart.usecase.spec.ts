import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { GetStockChartUsecase } from './get-stock-chart.usecase';
import {
  STOCK_CHART_GATEWAY_A_PORT,
  STOCK_CHART_GATEWAY_B_PORT,
  StockChartGatewayPort,
} from '../port/stock-chart.gateway.port';
import { StockChartPoint } from '../domain/stock-chart-point';

const point = (date: string, priceJpy: number): StockChartPoint =>
  new StockChartPoint({ date, priceJpy });

describe('GetStockChartUsecase', () => {
  let usecase: GetStockChartUsecase;
  let gatewayA: jest.Mocked<StockChartGatewayPort>;
  let gatewayB: jest.Mocked<StockChartGatewayPort>;

  beforeEach(async () => {
    gatewayA = { getStockChart: jest.fn() };
    gatewayB = { getStockChart: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetStockChartUsecase,
        { provide: STOCK_CHART_GATEWAY_A_PORT, useValue: gatewayA },
        { provide: STOCK_CHART_GATEWAY_B_PORT, useValue: gatewayB },
      ],
    }).compile();

    usecase = module.get<GetStockChartUsecase>(GetStockChartUsecase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    // @SC-11: 両サービス成功時、同日付のデータは平均値が返される
    it('正常系: A・B両方に存在する日付は平均値を返す', async () => {
      // Arrange
      gatewayA.getStockChart.mockResolvedValue([
        point('2025-10-01', 300000),
        point('2025-11-01', 320000),
      ]);
      gatewayB.getStockChart.mockResolvedValue([
        point('2025-10-01', 310000),
        point('2025-11-01', 330000),
      ]);

      // Act
      const result = await usecase.execute('トヨタ自動車', '6m');

      // Assert
      expect(result.name).toBe('トヨタ自動車');
      expect(result.period).toBe('6m');
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ date: '2025-10-01', priceJpy: 305000 });
      expect(result.items[1]).toEqual({ date: '2025-11-01', priceJpy: 325000 });
    });

    // @SC-11: 片方のみにある日付はそのまま使用
    it('正常系: 片方のみに存在する日付はその値がそのまま返る', async () => {
      // Arrange
      gatewayA.getStockChart.mockResolvedValue([point('2025-10-01', 300000)]);
      gatewayB.getStockChart.mockResolvedValue([point('2025-11-01', 330000)]);

      // Act
      const result = await usecase.execute('トヨタ自動車', '6m');

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ date: '2025-10-01', priceJpy: 300000 });
      expect(result.items[1]).toEqual({ date: '2025-11-01', priceJpy: 330000 });
    });

    // 片方のサービスのみ成功時
    it('正常系: GatewayAのみ成功した場合はAの結果を返す', async () => {
      // Arrange
      gatewayA.getStockChart.mockResolvedValue([point('2025-10-01', 300000)]);
      gatewayB.getStockChart.mockRejectedValue(new Error('Service B down'));

      // Act
      const result = await usecase.execute('トヨタ自動車', '6m');

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].priceJpy).toBe(300000);
    });

    it('正常系: GatewayBのみ成功した場合はBの結果を返す', async () => {
      // Arrange
      gatewayA.getStockChart.mockRejectedValue(new Error('Service A down'));
      gatewayB.getStockChart.mockResolvedValue([point('2025-10-01', 310000)]);

      // Act
      const result = await usecase.execute('トヨタ自動車', '6m');

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].priceJpy).toBe(310000);
    });

    // @SC-15: 両方失敗時
    it('異常系: 両Gateway失敗時はInternalServerErrorExceptionをスロー', async () => {
      // Arrange
      gatewayA.getStockChart.mockRejectedValue(new Error('Service A down'));
      gatewayB.getStockChart.mockRejectedValue(new Error('Service B down'));

      // Act & Assert
      await expect(usecase.execute('トヨタ自動車', '6m')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    // 無効な period
    it('異常系: 無効なperiodの場合はBadRequestExceptionをスロー', async () => {
      // Act & Assert
      await expect(usecase.execute('トヨタ自動車', 'invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    // Gateway を並列呼び出ししていることの確認
    it('正常系: GatewayA・Bを並列で呼び出す', async () => {
      // Arrange
      gatewayA.getStockChart.mockResolvedValue([]);
      gatewayB.getStockChart.mockResolvedValue([point('2025-10-01', 310000)]);

      // Act
      await usecase.execute('トヨタ自動車', '6m');

      // Assert
      expect(gatewayA.getStockChart).toHaveBeenCalledTimes(1);
      expect(gatewayB.getStockChart).toHaveBeenCalledTimes(1);
      // from/to が同じ引数で呼ばれること
      const argsA = gatewayA.getStockChart.mock.calls[0];
      const argsB = gatewayB.getStockChart.mock.calls[0];
      expect(argsA[0]).toBe('トヨタ自動車');
      expect(argsB[0]).toBe('トヨタ自動車');
      expect(argsA[1]).toBe(argsB[1]); // from が同じ
      expect(argsA[2]).toBe(argsB[2]); // to が同じ
    });

    // 結果が日付順にソートされること
    it('正常系: 結果が日付の昇順でソートされる', async () => {
      // Arrange
      gatewayA.getStockChart.mockResolvedValue([
        point('2025-12-01', 340000),
        point('2025-10-01', 300000),
      ]);
      gatewayB.getStockChart.mockResolvedValue([point('2025-11-01', 330000)]);

      // Act
      const result = await usecase.execute('トヨタ自動車', '6m');

      // Assert
      expect(result.items.map((i) => i.date)).toEqual([
        '2025-10-01',
        '2025-11-01',
        '2025-12-01',
      ]);
    });
  });

  describe('period → from/to 計算', () => {
    // period ごとに正しい日付範囲が計算されることを確認
    it.each([
      ['6m', 6, 'month'],
      ['1y', 1, 'year'],
      ['2y', 2, 'year'],
      ['10y', 10, 'year'],
    ] as const)('正常系: period=%s で正しい日付範囲が計算される', async (period, amount, unit) => {
      // Arrange
      gatewayA.getStockChart.mockResolvedValue([point('2025-10-01', 300000)]);
      gatewayB.getStockChart.mockResolvedValue([]);

      // Act
      await usecase.execute('トヨタ自動車', period);

      // Assert
      const [, from, to] = gatewayA.getStockChart.mock.calls[0];

      // to は今日の日付
      const now = new Date();
      const expectedTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(to).toBe(expectedTo);

      // from の検証
      const expectedFrom = new Date(now);
      if (unit === 'month') {
        expectedFrom.setMonth(expectedFrom.getMonth() - amount);
      } else {
        expectedFrom.setFullYear(expectedFrom.getFullYear() - amount);
      }
      const expectedFromStr = `${expectedFrom.getFullYear()}-${String(expectedFrom.getMonth() + 1).padStart(2, '0')}-${String(expectedFrom.getDate()).padStart(2, '0')}`;
      expect(from).toBe(expectedFromStr);
    });
  });
});
