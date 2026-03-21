import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { useStockChart, stockChartKeys } from './use-stock-chart';
import React, { type ReactNode } from 'react';

vi.mock('@/lib/api/stock-chart', () => ({
  fetchStockChart: vi.fn(),
}));

import { fetchStockChart } from '@/lib/api/stock-chart';

const mockChartResponse = {
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useStockChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: データが正しく返される', async () => {
    // Arrange
    vi.mocked(fetchStockChart).mockResolvedValue(mockChartResponse);

    // Act
    const { result } = renderHook(() => useStockChart('トヨタ自動車', '6m'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.data.name).toBe('トヨタ自動車');
    expect(result.current.data?.data.items).toHaveLength(2);
    expect(fetchStockChart).toHaveBeenCalledWith('トヨタ自動車', '6m');
  });

  it('異常系: API失敗時にisErrorがtrueになる', async () => {
    // Arrange
    vi.mocked(fetchStockChart).mockRejectedValue(new Error('サーバーエラー'));

    // Act
    const { result } = renderHook(() => useStockChart('トヨタ自動車', '6m'), {
      wrapper: createWrapper(),
    });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('正常系: クエリキーにname・periodが含まれる', () => {
    // Assert
    expect(stockChartKeys.detail('トヨタ自動車', '6m')).toEqual([
      'stock-chart',
      'トヨタ自動車',
      '6m',
    ]);
    expect(stockChartKeys.detail('トヨタ自動車', '1y')).toEqual([
      'stock-chart',
      'トヨタ自動車',
      '1y',
    ]);
  });
});
