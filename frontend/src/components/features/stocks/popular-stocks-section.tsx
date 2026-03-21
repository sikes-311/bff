'use client';

import Link from 'next/link';
import { usePopularStocks } from '@/hooks/use-popular-stocks';
import { StockCard } from './stock-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function PopularStocksSection() {
  const { data, isLoading, isError } = usePopularStocks();

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">人気銘柄 TOP5</h2>
        <Link href="/stocks" className="text-blue-600 hover:underline text-sm">
          その他の株価を見る
        </Link>
      </div>

      {isLoading && <LoadingSpinner />}

      {isError && (
        <p data-testid="stocks-error" className="text-red-600 p-4 bg-red-50 rounded">
          現在株価を表示できません。
        </p>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {data.data.map((stock) => (
            <StockCard key={stock.name} stock={stock} />
          ))}
        </div>
      )}
    </section>
  );
}
