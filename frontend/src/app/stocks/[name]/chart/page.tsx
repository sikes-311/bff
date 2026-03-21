'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useStockChart } from '@/hooks/use-stock-chart';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ChartPeriod } from '@/types/stock-chart';

export default function StockChartPage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name);
  const [period, setPeriod] = useState<ChartPeriod>('6m');
  const { data, isLoading, isError } = useStockChart(decodedName, period);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{decodedName}</h1>
        <select
          data-testid="chart-period-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value as ChartPeriod)}
          className="border rounded px-3 py-2 mb-6"
        >
          <option value="6m">6ヶ月</option>
          <option value="1y">1年</option>
          <option value="2y">2年</option>
          <option value="10y">10年</option>
        </select>

        {isLoading && (
          <div data-testid="chart-loading">
            <LoadingSpinner />
          </div>
        )}
        {isError && (
          <p data-testid="chart-error" className="text-red-600">
            現在チャートを表示できません。
          </p>
        )}
        {data && (
          <div data-testid="stock-chart">
            {/* SC-11〜SC-14 で Recharts を追加 */}
            <p>{data.data.items.length} 件のデータ</p>
          </div>
        )}
      </div>
    </main>
  );
}
