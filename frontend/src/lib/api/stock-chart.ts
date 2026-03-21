import { apiClient, ApiResponse } from './client';
import { StockChartData } from '@/types/stock-chart';
import { ChartPeriod } from '@/types/stock-chart';

export async function fetchStockChart(name: string, period: ChartPeriod): Promise<StockChartData> {
  const response = await apiClient.get<ApiResponse<StockChartData>>(
    `/stocks/${encodeURIComponent(name)}/chart`,
    { params: { period } },
  );
  return response.data.data;
}
