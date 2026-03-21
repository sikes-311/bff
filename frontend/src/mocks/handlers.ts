import { http, HttpResponse } from 'msw';
import type { User } from '@/types/user';
import type { StockRate } from '@/types/stock';

const BASE_URL = 'http://localhost:3001';

const mockPopularStocks: StockRate[] = [
  { name: 'Apple Inc.', priceJpy: 25000, priceUsd: 170.5, changePercent: 1.25 },
  { name: 'Google', priceJpy: 20000, priceUsd: 140.0, changePercent: -0.5 },
  { name: 'Amazon', priceJpy: 18000, priceUsd: 120.0, changePercent: 2.1 },
  { name: 'Microsoft', priceJpy: 50000, priceUsd: 340.0, changePercent: 0.3 },
  { name: 'Tesla', priceJpy: 30000, priceUsd: 200.0, changePercent: -1.8 },
];

const mockUsers: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user', createdAt: '2024-01-02T00:00:00Z' },
];

export const handlers = [
  http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        data: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
        meta: { timestamp: new Date().toISOString() },
      });
    }
    return HttpResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '認証失敗' }, meta: { timestamp: new Date().toISOString() } },
      { status: 401 },
    );
  }),

  http.get(`${BASE_URL}/api/v1/users`, () => {
    return HttpResponse.json({
      data: { items: mockUsers, total: 2, page: 1, limit: 20 },
      meta: { timestamp: new Date().toISOString() },
    });
  }),

  http.get(`${BASE_URL}/api/v1/stocks/popular`, () => {
    return HttpResponse.json({
      data: mockPopularStocks,
      meta: { timestamp: new Date().toISOString() },
    });
  }),

  http.get(`${BASE_URL}/api/v1/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === params['id']);
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'ユーザーが見つかりません' }, meta: { timestamp: new Date().toISOString() } },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      data: user,
      meta: { timestamp: new Date().toISOString() },
    });
  }),
];
