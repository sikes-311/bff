import { Stock } from '../domain/stock';

export const STOCKS_GATEWAY_A_PORT = Symbol('STOCKS_GATEWAY_A_PORT');
export const STOCKS_GATEWAY_B_PORT = Symbol('STOCKS_GATEWAY_B_PORT');

export interface StocksGatewayPort {
  getPopularStocks(limit: number): Promise<Stock[]>;
}
