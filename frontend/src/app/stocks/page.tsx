'use client';

import { useState, useMemo } from 'react';
import { usePopularStocks } from '@/hooks/use-popular-stocks';
import { StockCard } from '@/components/features/stocks/stock-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StockRate } from '@/types/stock';

type SortOrder = 'gain' | 'loss';

function isSortOrder(value: string): value is SortOrder {
  return value === 'gain' || value === 'loss';
}

function sortStocks(stocks: StockRate[], order: SortOrder): StockRate[] {
  return [...stocks].sort((a, b) => {
    const diff =
      order === 'gain'
        ? b.changePercent - a.changePercent
        : a.changePercent - b.changePercent;
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, 'ja');
  });
}

export default function StocksPage() {
  const { data, isLoading, isError } = usePopularStocks();
  const [sortOrder, setSortOrder] = useState<SortOrder>('gain');

  const sortedStocks = useMemo(
    () => (data ? sortStocks(data.data, sortOrder) : []),
    [data, sortOrder]
  );

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">株価一覧</h1>

        <div className="mb-4">
          <select
            data-testid="sort-select"
            value={sortOrder}
            onChange={(e) => {
              if (isSortOrder(e.target.value)) setSortOrder(e.target.value);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="gain">値上がり順</option>
            <option value="loss">値下がり順</option>
          </select>
        </div>

        {isLoading && <LoadingSpinner />}

        {isError && (
          <p data-testid="stocks-error" className="text-red-600">
            現在株価を表示できません。
          </p>
        )}

        {data && (
          <div data-testid="stocks-list" className="grid grid-cols-1 gap-4">
            {sortedStocks.map((stock, index) => (
              <StockCard
                key={`${stock.name}-${index}`}
                stock={stock}
                href={`/stocks/${encodeURIComponent(stock.name)}/chart`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
