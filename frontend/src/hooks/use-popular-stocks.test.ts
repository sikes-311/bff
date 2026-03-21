import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { usePopularStocks } from './use-popular-stocks';
import React, { type ReactNode } from 'react';

// API関数をモック
vi.mock('@/lib/api/stocks', () => ({
  getPopularStocks: vi.fn(),
}));

import { getPopularStocks } from '@/lib/api/stocks';

const mockStocks = [
  { name: 'Apple Inc.', priceJpy: 25000, priceUsd: 170.5, changePercent: 1.25 },
  { name: 'Google', priceJpy: 20000, priceUsd: 140.0, changePercent: -0.5 },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePopularStocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常系: データが正しく返される', async () => {
    // Arrange
    vi.mocked(getPopularStocks).mockResolvedValue(mockStocks);

    // Act
    const { result } = renderHook(() => usePopularStocks(), { wrapper: createWrapper() });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Apple Inc.');
  });

  it('異常系: エラー時にエラーが返される', async () => {
    // Arrange
    vi.mocked(getPopularStocks).mockRejectedValue(new Error('サーバーエラー'));

    // Act
    const { result } = renderHook(() => usePopularStocks(), { wrapper: createWrapper() });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
