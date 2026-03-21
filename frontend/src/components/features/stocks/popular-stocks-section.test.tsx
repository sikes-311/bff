import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { PopularStocksSection } from './popular-stocks-section';
import type { StockRate } from '@/types/stock';

// usePopularStocks フックをモック
const mockUsePopularStocks = vi.fn();
vi.mock('@/hooks/use-popular-stocks', () => ({
  usePopularStocks: () => mockUsePopularStocks(),
}));

const mockStocks: StockRate[] = [
  { name: 'Apple Inc.', priceJpy: 25000, priceUsd: 170.5, changePercent: 1.25 },
  { name: 'Google', priceJpy: 20000, priceUsd: 140.0, changePercent: -0.5 },
  { name: 'Amazon', priceJpy: 18000, priceUsd: 120.0, changePercent: 2.1 },
  { name: 'Microsoft', priceJpy: 50000, priceUsd: 340.0, changePercent: 0.3 },
  { name: 'Tesla', priceJpy: 30000, priceUsd: 200.0, changePercent: -1.8 },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('PopularStocksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: ローディング中にスピナーが表示される', () => {
    // Arrange
    mockUsePopularStocks.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    // Act
    const { container } = render(<PopularStocksSection />, { wrapper: createWrapper() });

    // Assert
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('異常系: エラー時に「現在株価を表示できません。」が表示される', () => {
    // Arrange
    mockUsePopularStocks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    // Act
    render(<PopularStocksSection />, { wrapper: createWrapper() });

    // Assert
    expect(screen.getByTestId('stocks-error')).toHaveTextContent('現在株価を表示できません。');
  });

  it('正常系: 成功時に5枚のstock-cardが表示される', () => {
    // Arrange
    mockUsePopularStocks.mockReturnValue({
      data: { data: mockStocks, meta: { timestamp: '2026-03-21T00:00:00Z' } },
      isLoading: false,
      isError: false,
    });

    // Act
    render(<PopularStocksSection />, { wrapper: createWrapper() });

    // Assert
    expect(screen.getAllByTestId('stock-card')).toHaveLength(5);
  });

  it('正常系: 「その他の株価を見る」リンクがある', () => {
    // Arrange
    mockUsePopularStocks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    // Act
    render(<PopularStocksSection />, { wrapper: createWrapper() });

    // Assert
    const link = screen.getByRole('link', { name: /その他の株価を見る/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/stocks');
  });
});
