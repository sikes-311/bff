/**
 * ローカル開発用 ダウンストリームサービス モックサーバー
 *
 * 起動: node mock-server.mjs
 * ポート: 4001 (SERVICE_A_URL 相当), 4002 (SERVICE_B_URL 相当)
 *
 * 対応エンドポイント:
 *   GET /users             → ユーザー一覧
 *   GET /users/:id         → ユーザー詳細
 *   GET /stocks/popular    → 人気株価一覧
 *   GET /stocks/:name/chart → 銘柄チャートデータ
 *
 * テスト制御:
 *   POST /admin/force-error       → /stocks/popular を 500 エラー返却モードに切替
 *   POST /admin/clear-error       → エラーモード解除
 *   POST /admin/force-chart-error → /stocks/:name/chart を 500 エラー返却モードに切替
 *   POST /admin/clear-chart-error → チャートエラーモード解除
 */

import { createServer } from 'node:http';

// ----- モックデータ: ユーザー -----
const USERS = [
  { id: '1', name: '田中 太郎', email: 'taro@example.com', role: 'admin', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: '2', name: '鈴木 花子', email: 'hanako@example.com', role: 'user', createdAt: '2024-02-01T00:00:00.000Z' },
  { id: '3', name: '佐藤 次郎', email: 'jiro@example.com', role: 'user', createdAt: '2024-03-01T00:00:00.000Z' },
  { id: '4', name: '山田 三郎', email: 'saburo@example.com', role: 'user', createdAt: '2024-04-01T00:00:00.000Z' },
  { id: '5', name: '伊藤 四郎', email: 'shiro@example.com', role: 'editor', createdAt: '2024-05-01T00:00:00.000Z' },
];

/**
 * 株価モックデータ設計（E2Eシナリオ対応）
 *
 * SC-4: システムA・B 共通銘柄 → BFF が平均値を計算して返す
 *   例) トヨタ: A=350000, B=360000 → 平均 355000 (100株あたり) がフロントエンドに表示される
 *
 * SC-5: システムA のみに存在する銘柄 → BFF がそのまま返す
 *   例) キーエンス: A=4000000, Bに存在せず → 4000000 がフロントエンドに表示される
 *
 * SC-1: merged 結果が 5銘柄になるよう設計
 *   A: トヨタ・ソニー・任天堂・ソフトバンク・キーエンス (5件)
 *   B: トヨタ・ソニー・任天堂・ソフトバンク (4件, キーエンスなし)
 *   → merged: 5銘柄 (共通4 + キーエンスA-only)
 */
const STOCKS_A = [
  { stockname: 'トヨタ自動車',   price_jpy: 350000,   price_usd: 2400,  changePercent:  1.5 },
  { stockname: 'ソニーグループ', price_jpy: 1200000,  price_usd: 8100,  changePercent: -0.8 },
  { stockname: '任天堂',         price_jpy: 700000,   price_usd: 4700,  changePercent:  2.3 },
  { stockname: 'ソフトバンク',   price_jpy: 170000,   price_usd: 1150,  changePercent:  0.5 },
  { stockname: 'キーエンス',     price_jpy: 4000000,  price_usd: 27000, changePercent:  0.3 },
];

const STOCKS_B = [
  { stockname: 'トヨタ自動車',   price_jpy: 360000,   price_usd: 2600,  changePercent:  1.7 },
  { stockname: 'ソニーグループ', price_jpy: 1220000,  price_usd: 8300,  changePercent: -0.6 },
  { stockname: '任天堂',         price_jpy: 720000,   price_usd: 4900,  changePercent:  2.5 },
  { stockname: 'ソフトバンク',   price_jpy: 180000,   price_usd: 1200,  changePercent:  0.7 },
];

// ----- モックデータ: チャート (10年分月次データ) -----
function generateChartData(stockConfig) {
  const data = [];
  const startDate = new Date(2016, 0, 1);
  const endDate = new Date(2026, 2, 1);
  const totalMonths =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  for (let i = 0; i <= totalMonths; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const ratio = i / totalMonths;
    const price = Math.round(
      stockConfig.startPrice + (stockConfig.endPrice - stockConfig.startPrice) * ratio,
    );
    data.push({ date: `${year}-${month}-01`, price_jpy: price });
  }
  return data;
}

const CHART_CONFIG_A = {
  'トヨタ自動車':   { startPrice: 300000,   endPrice: 380000 },
  'ソニーグループ': { startPrice: 1100000,  endPrice: 1300000 },
  '任天堂':         { startPrice: 650000,   endPrice: 780000 },
  'ソフトバンク':   { startPrice: 150000,   endPrice: 200000 },
  'キーエンス':     { startPrice: 3800000,  endPrice: 4200000 },
};

const CHART_CONFIG_B = {
  'トヨタ自動車':   { startPrice: 310000,   endPrice: 390000 },
  'ソニーグループ': { startPrice: 1120000,  endPrice: 1310000 },
  '任天堂':         { startPrice: 660000,   endPrice: 790000 },
  'ソフトバンク':   { startPrice: 155000,   endPrice: 205000 },
};

const CHART_DATA_A = {};
for (const [name, config] of Object.entries(CHART_CONFIG_A)) {
  CHART_DATA_A[name] = generateChartData(config);
}

const CHART_DATA_B = {};
for (const [name, config] of Object.entries(CHART_CONFIG_B)) {
  CHART_DATA_B[name] = generateChartData(config);
}

// ----- エラーモード制御 -----
let errorModeA = false;
let errorModeB = false;
let chartErrorModeA = false;
let chartErrorModeB = false;

// ----- ユーティリティ -----
function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
  });
}

// ----- ルート定義ファクトリ -----
function buildRoutes(stocks, chartData, getErrorMode, getChartErrorMode, setChartErrorMode) {
  return [
    // GET /users?page=1&limit=20
    {
      method: 'GET',
      pattern: /^\/users(\?.*)?$/,
      handler: (req, res, port) => {
        const url = new URL(req.url, `http://localhost:${port}`);
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
    // GET /stocks/popular?limit=N
    {
      method: 'GET',
      pattern: /^\/stocks\/popular(\?.*)?$/,
      handler: (req, res, port) => {
        if (getErrorMode()) {
          send(res, 500, { message: 'Internal Server Error (simulated)' });
          return;
        }
        const url = new URL(req.url, `http://localhost:${port}`);
        const limit = Math.min(10, Math.max(1, parseInt(url.searchParams.get('limit') ?? '5')));
        send(res, 200, stocks.slice(0, limit));
      },
    },
    // GET /stocks/:name/chart?from=&to=
    {
      method: 'GET',
      pattern: /^\/stocks\/[^/]+\/chart(\?.*)?$/,
      handler: (req, res, port) => {
        if (getChartErrorMode()) {
          send(res, 500, { error: 'chart error' });
          return;
        }
        const url = new URL(req.url, `http://localhost:${port}`);
        const pathParts = url.pathname.split('/');
        const name = decodeURIComponent(pathParts[2]);
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const data = chartData[name] || [];
        const filtered = data.filter(
          (d) => (!from || d.date >= from) && (!to || d.date <= to),
        );
        send(res, 200, filtered);
      },
    },
    // POST /admin/force-error
    {
      method: 'POST',
      pattern: /^\/admin\/force-error$/,
      handler: async (req, res) => {
        await readBody(req);
        errorModeA = true;
        errorModeB = true;
        send(res, 200, { message: 'error mode ON' });
      },
    },
    // POST /admin/clear-error
    {
      method: 'POST',
      pattern: /^\/admin\/clear-error$/,
      handler: async (req, res) => {
        await readBody(req);
        errorModeA = false;
        errorModeB = false;
        send(res, 200, { message: 'error mode OFF' });
      },
    },
    // POST /admin/force-chart-error
    {
      method: 'POST',
      pattern: /^\/admin\/force-chart-error$/,
      handler: async (req, res) => {
        await readBody(req);
        setChartErrorMode(true);
        send(res, 200, { ok: true });
      },
    },
    // POST /admin/clear-chart-error
    {
      method: 'POST',
      pattern: /^\/admin\/clear-chart-error$/,
      handler: async (req, res) => {
        await readBody(req);
        setChartErrorMode(false);
        send(res, 200, { ok: true });
      },
    },
  ];
}

// ----- サーバー起動 -----
function startServer(port, routes, label) {
  const server = createServer((req, res) => {
    const path = req.url.split('?')[0];
    const route = routes.find((r) => r.method === req.method && r.pattern.test(req.url));
    if (route) {
      console.log(`[${label}] ${req.method} ${req.url}`);
      route.handler(req, res, port);
    } else {
      console.warn(`[${label}] 404 ${req.method} ${path}`);
      send(res, 404, { message: `Not found: ${req.method} ${path}` });
    }
  });

  server.listen(port, () => {
    console.log(`\nMock server (${label}) running at http://localhost:${port}`);
    console.log('Endpoints:');
    console.log(`  GET  http://localhost:${port}/users`);
    console.log(`  GET  http://localhost:${port}/users/:id`);
    console.log(`  GET  http://localhost:${port}/stocks/popular`);
    console.log(`  GET  http://localhost:${port}/stocks/:name/chart`);
    console.log(`  POST http://localhost:${port}/admin/force-error`);
    console.log(`  POST http://localhost:${port}/admin/clear-error`);
    console.log(`  POST http://localhost:${port}/admin/force-chart-error`);
    console.log(`  POST http://localhost:${port}/admin/clear-chart-error`);
  });
}

const routesA = buildRoutes(
  STOCKS_A,
  CHART_DATA_A,
  () => errorModeA,
  () => chartErrorModeA,
  (v) => { chartErrorModeA = v; },
);
const routesB = buildRoutes(
  STOCKS_B,
  CHART_DATA_B,
  () => errorModeB,
  () => chartErrorModeB,
  (v) => { chartErrorModeB = v; },
);

startServer(4001, routesA, 'Service A');
startServer(4002, routesB, 'Service B');
