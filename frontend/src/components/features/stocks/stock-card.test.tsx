import { render, screen } from '@testing-library/react';
import { StockCard } from './stock-card';
import type { StockRate } from '@/types/stock';

const mockStock: StockRate = {
  name: 'Apple Inc.',
  priceJpy: 25000,
  priceUsd: 170.5,
  changePercent: 1.25,
};

const mockStockNegative: StockRate = {
  name: 'Tesla Inc.',
  priceJpy: 30000,
  priceUsd: 200.0,
  changePercent: -2.5,
};

describe('StockCard', () => {
  it('正常系: 銘柄名・円建て株価・ドル建て株価・前日比が表示される', () => {
    // Arrange & Act
    render(<StockCard stock={mockStock} />);

    // Assert
    expect(screen.getByTestId('stock-name')).toHaveTextContent('Apple Inc.');
    expect(screen.getByTestId('stock-price-jpy')).toHaveTextContent('¥25,000');
    expect(screen.getByTestId('stock-price-usd')).toHaveTextContent('$170.50');
    expect(screen.getByTestId('stock-change-percent')).toHaveTextContent('+1.25%');
  });

  it('正常系: 前日比プラスのとき緑色クラスが付く', () => {
    // Arrange & Act
    render(<StockCard stock={mockStock} />);

    // Assert
    expect(screen.getByTestId('stock-change-percent')).toHaveClass('text-green-600');
  });

  it('正常系: 前日比マイナスのとき赤色クラスが付く', () => {
    // Arrange & Act
    render(<StockCard stock={mockStockNegative} />);

    // Assert
    expect(screen.getByTestId('stock-change-percent')).toHaveClass('text-red-600');
    expect(screen.getByTestId('stock-change-percent')).toHaveTextContent('-2.50%');
  });

  it('正常系: data-testidが正しく設定されている', () => {
    // Arrange & Act
    render(<StockCard stock={mockStock} />);

    // Assert
    expect(screen.getByTestId('stock-card')).toBeInTheDocument();
    expect(screen.getByTestId('stock-name')).toBeInTheDocument();
    expect(screen.getByTestId('stock-price-jpy')).toBeInTheDocument();
    expect(screen.getByTestId('stock-price-usd')).toBeInTheDocument();
    expect(screen.getByTestId('stock-change-percent')).toBeInTheDocument();
  });

  it('正常系: hrefなしの場合はdivでレンダリングされる', () => {
    // Arrange & Act
    render(<StockCard stock={mockStock} />);

    // Assert
    const card = screen.getByTestId('stock-card');
    expect(card.closest('a')).toBeNull();
  });

  it('正常系: hrefありの場合はLinkでラップされhrefが設定される', () => {
    // Arrange
    const href = '/stocks/Apple%20Inc./chart';

    // Act
    render(<StockCard stock={mockStock} href={href} />);

    // Assert
    const link = screen.getByTestId('stock-card').closest('a');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', href);
  });
});
