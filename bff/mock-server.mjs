/**
 * ローカル開発用 ダウンストリームサービス モックサーバー
 *
 * 起動: node mock-server.mjs
 * ポート: 4001 (SERVICE_A_URL 相当)
 *
 * 対応エンドポイント:
 *   GET /users          → ユーザー一覧
 *   GET /users/:id      → ユーザー詳細
 */

import { createServer } from 'node:http';

const PORT = 4001;

// ----- モックデータ -----
const USERS = [
  { id: '1', name: '田中 太郎', email: 'taro@example.com', role: 'admin', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: '2', name: '鈴木 花子', email: 'hanako@example.com', role: 'user', createdAt: '2024-02-01T00:00:00.000Z' },
  { id: '3', name: '佐藤 次郎', email: 'jiro@example.com', role: 'user', createdAt: '2024-03-01T00:00:00.000Z' },
  { id: '4', name: '山田 三郎', email: 'saburo@example.com', role: 'user', createdAt: '2024-04-01T00:00:00.000Z' },
  { id: '5', name: '伊藤 四郎', email: 'shiro@example.com', role: 'editor', createdAt: '2024-05-01T00:00:00.000Z' },
];

// ----- ルーティング -----
const routes = [
  // GET /users?page=1&limit=20
  {
    method: 'GET',
    pattern: /^\/users(\?.*)?$/,
    handler: (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));
      const start = (page - 1) * limit;
      const items = USERS.slice(start, start + limit);
      send(res, 200, { items, total: USERS.length, page, limit });
    },
  },
  // GET /users/:id
  {
    method: 'GET',
    pattern: /^\/users\/([^/?]+)$/,
    handler: (req, res) => {
      const id = req.url.split('/')[2];
      const user = USERS.find((u) => u.id === id);
      if (!user) {
        send(res, 404, { message: `ユーザー(id=${id})が見つかりません` });
      } else {
        send(res, 200, user);
      }
    },
  },
];

// ----- ユーティリティ -----
function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

// ----- サーバー起動 -----
const server = createServer((req, res) => {
  const path = req.url.split('?')[0];
  const route = routes.find((r) => r.method === req.method && r.pattern.test(req.url));

  if (route) {
    console.log(`[mock] ${req.method} ${req.url}`);
    route.handler(req, res);
  } else {
    console.warn(`[mock] 404 ${req.method} ${path}`);
    send(res, 404, { message: `Not found: ${req.method} ${path}` });
  }
});

server.listen(PORT, () => {
  console.log(`\nMock server (Service A) running at http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log(`  GET http://localhost:${PORT}/users`);
  console.log(`  GET http://localhost:${PORT}/users/:id\n`);
});
