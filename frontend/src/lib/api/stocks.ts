import { apiClient, ApiResponse } from './client';
import { PopularStocksResponse } from '@/types/stock';

export async function getPopularStocks(): Promise<PopularStocksResponse> {
  const response = await apiClient.get<ApiResponse<PopularStocksResponse>>('/stocks/popular');
  return response.data.data;
}
