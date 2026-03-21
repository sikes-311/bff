'use client';

import { usePopularStocks } from '@/hooks/use-popular-stocks';
import { StockCard } from '@/components/features/stocks/stock-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function StocksPage() {
  const { data, isLoading, isError } = usePopularStocks();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">株価一覧</h1>

        {isLoading && <LoadingSpinner />}

        {isError && (
          <p className="text-red-600">現在株価を表示できません。</p>
        )}

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((stock) => (
              <StockCard key={stock.name} stock={stock} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
