import { apiClient, ApiResponse } from './client';
import { StockChartResponse } from '@/types/stock-chart';

export async function fetchStockChart(name: string, period: string): Promise<StockChartResponse> {
  const response = await apiClient.get<ApiResponse<StockChartResponse>>(
    `/stocks/${encodeURIComponent(name)}/chart`,
    { params: { period } },
  );
  return response.data.data;
}
