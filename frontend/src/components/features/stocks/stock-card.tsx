'use client';

import Link from 'next/link';
import { StockRate } from '@/types/stock';

type Props = {
  stock: StockRate;
  href?: string;
};

export function StockCard({ stock, href }: Props) {
  const isPositive = stock.changePercent >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const changePrefix = isPositive ? '+' : '';

  const content = (
    <div data-testid="stock-card" className="p-4 border rounded-lg bg-white shadow-sm">
      <p data-testid="stock-name" className="font-semibold text-lg">{stock.name}</p>
      <p data-testid="stock-price-jpy" className="text-gray-700">
        ¥{stock.priceJpy.toLocaleString()}
      </p>
      <p data-testid="stock-price-usd" className="text-gray-700">
        ${stock.priceUsd.toFixed(2)}
      </p>
      <p data-testid="stock-change-percent" className={changeColor}>
        {changePrefix}{stock.changePercent.toFixed(2)}%
      </p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
