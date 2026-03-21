import { StockChartPoint } from '../domain/stock-chart-point';

export const STOCK_CHART_GATEWAY_A_PORT = Symbol('STOCK_CHART_GATEWAY_A_PORT');
export const STOCK_CHART_GATEWAY_B_PORT = Symbol('STOCK_CHART_GATEWAY_B_PORT');

export interface StockChartGatewayPort {
  getStockChart(name: string, from: string, to: string): Promise<StockChartPoint[]>;
}
