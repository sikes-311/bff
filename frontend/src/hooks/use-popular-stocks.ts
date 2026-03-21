import { useQuery } from '@tanstack/react-query';
import { getPopularStocks } from '@/lib/api/stocks';

export const stockKeys = {
  all: ['stocks'] as const,
  popular: () => [...stockKeys.all, 'popular'] as const,
};

export function usePopularStocks() {
  return useQuery({
    queryKey: stockKeys.popular(),
    queryFn: getPopularStocks,
    staleTime: 30_000,
  });
}
