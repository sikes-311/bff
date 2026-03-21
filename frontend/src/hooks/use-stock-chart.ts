import { useQuery } from '@tanstack/react-query';
import { fetchStockChart } from '@/lib/api/stock-chart';

export const stockChartKeys = {
  all: ['stock-chart'] as const,
  detail: (name: string, period: string) => ['stock-chart', name, period] as const,
};

export function useStockChart(name: string, period: string) {
  return useQuery({
    queryKey: stockChartKeys.detail(name, period),
    queryFn: () => fetchStockChart(name, period),
  });
}
