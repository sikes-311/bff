import { useQuery } from '@tanstack/react-query';
import { fetchStockChart } from '@/lib/api/stock-chart';
import { ChartPeriod } from '@/types/stock-chart';

export const stockChartKeys = {
  all: ['stock-chart'] as const,
  detail: (name: string, period: ChartPeriod) => ['stock-chart', name, period] as const,
};

export function useStockChart(name: string, period: ChartPeriod) {
  return useQuery({
    queryKey: stockChartKeys.detail(name, period),
    queryFn: () => fetchStockChart(name, period),
  });
}
