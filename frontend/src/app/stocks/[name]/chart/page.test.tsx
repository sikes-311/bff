import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import StockChartPage from './page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ name: '%E3%83%88%E3%83%A8%E3%82%BF%E8%87%AA%E5%8B%95%E8%BB%8A' }),
}));

vi.mock('@/hooks/use-stock-chart', () => ({
  useStockChart: vi.fn(),
}));

import { useStockChart } from '@/hooks/use-stock-chart';

const mockChartData = {
  data: {
    name: 'トヨタ自動車',
    period: '6m' as const,
    items: [
      { date: '2025-10-01', priceJpy: 300000 },
      { date: '2025-11-01', priceJpy: 310000 },
    ],
  },
  meta: { timestamp: '2026-03-21T00:00:00Z' },
};

describe('StockChartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: ローディング中にLoadingSpinnerが表示される', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartPage />);

    // Assert
    expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stock-chart')).not.toBeInTheDocument();
  });

  it('異常系: エラー時にchart-errorが表示される', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartPage />);

    // Assert
    expect(screen.getByTestId('chart-error')).toBeInTheDocument();
    expect(screen.getByText('現在チャートを表示できません。')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stock-chart')).not.toBeInTheDocument();
  });

  it('正常系: データ取得成功時にstock-chartが表示される', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: mockChartData,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartPage />);

    // Assert
    expect(screen.getByTestId('stock-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chart-error')).not.toBeInTheDocument();
  });

  it('正常系: 期間セレクト変更でuseStockChartが新しいperiodで呼ばれる', async () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: mockChartData,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStockChart>);
    const user = userEvent.setup();

    // Act
    render(<StockChartPage />);
    const select = screen.getByTestId('chart-period-select');
    await user.selectOptions(select, '1y');

    // Assert
    const calls = vi.mocked(useStockChart).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe('トヨタ自動車');
    expect(lastCall[1]).toBe('1y');
  });

  it('正常系: デフォルトの期間が6ヶ月である', () => {
    // Arrange
    vi.mocked(useStockChart).mockReturnValue({
      data: mockChartData,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useStockChart>);

    // Act
    render(<StockChartPage />);

    // Assert
    const select = screen.getByTestId('chart-period-select') as HTMLSelectElement;
    expect(select.value).toBe('6m');
    expect(vi.mocked(useStockChart)).toHaveBeenCalledWith('トヨタ自動車', '6m');
  });
});
