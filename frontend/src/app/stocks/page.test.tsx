import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import StocksPage from './page';
import type { StockRate } from '@/types/stock';

// usePopularStocks フックをモック
const mockUsePopularStocks = vi.fn();
vi.mock('@/hooks/use-popular-stocks', () => ({
  usePopularStocks: () => mockUsePopularStocks(),
}));

const mockStocks: StockRate[] = [
  { name: '任天堂', priceJpy: 80000, priceUsd: 530.0, changePercent: 2.4 },
  { name: 'トヨタ自動車', priceJpy: 355000, priceUsd: 2350.0, changePercent: 1.6 },
  { name: 'ソフトバンク', priceJpy: 18000, priceUsd: 120.0, changePercent: 0.6 },
  { name: 'キーエンス', priceJpy: 700000, priceUsd: 4630.0, changePercent: 0.3 },
  { name: 'ソニーグループ', priceJpy: 13000, priceUsd: 86.0, changePercent: -0.7 },
];

describe('StocksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('デフォルト表示（値上がり順）', () => {
    it('正常系: データ取得後に値上がり順（changePercent 降順）でレンダリングされる [SC-7]', () => {
      // Arrange
      mockUsePopularStocks.mockReturnValue({
        data: { data: mockStocks, meta: { timestamp: '2026-03-21T00:00:00Z' } },
        isLoading: false,
        isError: false,
      });

      // Act
      render(<StocksPage />);

      // Assert
      const stockNames = screen
        .getAllByTestId('stock-name')
        .map((el) => el.textContent);
      expect(stockNames).toEqual([
        '任天堂',
        'トヨタ自動車',
        'ソフトバンク',
        'キーエンス',
        'ソニーグループ',
      ]);
    });
  });

  describe('値下がり順', () => {
    it('正常系: sort-select を loss に変更すると値下がり順（changePercent 昇順）でレンダリングされる [SC-8]', async () => {
      // Arrange
      mockUsePopularStocks.mockReturnValue({
        data: { data: mockStocks, meta: { timestamp: '2026-03-21T00:00:00Z' } },
        isLoading: false,
        isError: false,
      });
      const user = userEvent.setup();

      // Act
      render(<StocksPage />);
      await user.selectOptions(screen.getByTestId('sort-select'), 'loss');

      // Assert
      const stockNames = screen
        .getAllByTestId('stock-name')
        .map((el) => el.textContent);
      expect(stockNames).toEqual([
        'ソニーグループ',
        'キーエンス',
        'ソフトバンク',
        'トヨタ自動車',
        '任天堂',
      ]);
    });
  });

  describe('同率タイブレーク', () => {
    it('正常系: changePercent が同じ場合は銘柄名の五十音順（localeCompare 昇順）でソートされる', () => {
      // Arrange
      const tiedStocks: StockRate[] = [
        { name: 'ソフトバンク', priceJpy: 18000, priceUsd: 120.0, changePercent: 1.0 },
        { name: 'アサヒグループ', priceJpy: 5000, priceUsd: 33.0, changePercent: 1.0 },
        { name: 'キーエンス', priceJpy: 700000, priceUsd: 4630.0, changePercent: 1.0 },
      ];
      mockUsePopularStocks.mockReturnValue({
        data: { data: tiedStocks, meta: { timestamp: '2026-03-21T00:00:00Z' } },
        isLoading: false,
        isError: false,
      });

      // Act
      render(<StocksPage />);

      // Assert
      const stockNames = screen
        .getAllByTestId('stock-name')
        .map((el) => el.textContent);
      // 五十音順: ア < キ < ソ
      expect(stockNames).toEqual(['アサヒグループ', 'キーエンス', 'ソフトバンク']);
    });
  });

  describe('ローディング状態', () => {
    it('正常系: ローディング中は LoadingSpinner が表示される', () => {
      // Arrange
      mockUsePopularStocks.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      // Act
      render(<StocksPage />);

      // Assert
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    it('異常系: エラー時は data-testid="stocks-error" に「現在株価を表示できません。」が表示される', () => {
      // Arrange
      mockUsePopularStocks.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      // Act
      render(<StocksPage />);

      // Assert
      const errorEl = screen.getByTestId('stocks-error');
      expect(errorEl).toBeInTheDocument();
      expect(within(errorEl).getByText('現在株価を表示できません。')).toBeInTheDocument();
    });
  });
});
