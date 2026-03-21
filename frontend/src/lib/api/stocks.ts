import { apiClient, ApiResponse } from './client';
import { StockRate } from '@/types/stock';

export async function getPopularStocks(): Promise<StockRate[]> {
  const response = await apiClient.get<ApiResponse<StockRate[]>>('/stocks/popular');
  return response.data.data;
}
