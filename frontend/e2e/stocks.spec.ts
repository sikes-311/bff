/**
 * E2E テスト: 人気トップ5株銘柄のレート情報表示
 *
 * モック境界:
 *   - Downstream Service A (port 4001): mock-server.mjs で提供
 *   - Downstream Service B (port 4002): mock-server.mjs で提供
 *   - BFF (port 3001):         実サーバー（NestJS）
 *   - Frontend (port 3000):    実サーバー（Next.js）
 *   - 認証:                    実ログインフロー（test@example.com / password123）
 *
 * 事前準備:
 *   cd bff && node mock-server.mjs   # Service A (4001) + Service B (4002)
 *   cd bff && npm run start:dev      # BFF (3001)
 *   cd frontend && npm run dev       # Frontend (3000)
 *
 * BFF が計算する期待値（100株あたり）:
 *   トヨタ: A=350000, B=360000 → 平均 355000 → 表示: ¥355,000
 *   キーエンス: A=4000000, Bなし → そのまま 4000000 → 表示: ¥4,000,000
 */

import { test, expect, Page } from '@playwright/test';

// mock-server.mjs のエラーモードはプロセスグローバルな状態のため、
// 並行実行するとテスト間で状態が混入する。シリアル実行で分離する。
test.describe.configure({ mode: 'serial' });

const MOCK_ADMIN_A = 'http://localhost:4001/admin';
const MOCK_ADMIN_B = 'http://localhost:4002/admin';

/** 実ログインフォームを操作して認証する */
async function login(page: Page) {
  await page.goto('/login');
  // React のハイドレーション完了を待つ（ネットワークアイドル状態）
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  // ログイン後はトップページ(/)へリダイレクト
  await page.waitForURL('/');
}

/** ダウンストリームサーバーのエラーモードをリセットする */
async function clearErrorMode() {
  await Promise.all([
    fetch(`${MOCK_ADMIN_A}/clear-error`, { method: 'POST' }),
    fetch(`${MOCK_ADMIN_B}/clear-error`, { method: 'POST' }),
  ]);
}

/** チャート専用エラーモードをリセットする（SC-15 系テスト後に必ず実行） */
async function clearChartErrorMode() {
  await Promise.all([
    fetch(`${MOCK_ADMIN_A}/clear-chart-error`, { method: 'POST' }),
    fetch(`${MOCK_ADMIN_B}/clear-chart-error`, { method: 'POST' }),
  ]);
}

// 各テスト前後にエラーモードをリセットする
// beforeEach: 前テストの状態が残っていても確実にクリーンな状態で開始する
// afterEach: SC-6 系テスト後のエラーモードを解除する
test.beforeEach(async () => {
  await clearErrorMode();
});

test.afterEach(async () => {
  await clearErrorMode();
});

// @SC-1: ログイン後トップページで人気上位5銘柄の株価カードが表示される
test('SC-1: ログイン後トップページで人気上位5銘柄の株価カードが表示される', async ({ page }) => {
  await login(page);

  const stockCards = page.locator('[data-testid="stock-card"]');
  await expect(stockCards).toHaveCount(5);
});

// @SC-2: 「その他の株価を見る」で株価一覧ページへ遷移
test('SC-2: 株価表示カードセクションの「その他の株価を見る」で株価一覧ページへ遷移', async ({
  page,
}) => {
  await login(page);

  await page.click('text=その他の株価を見る');
  await expect(page).toHaveURL('/stocks');
});

// @SC-3: カード内に銘柄名・円建て株価・ドル建て株価・前日比(%)が表示される
test('SC-3: カード内に銘柄名・円建て株価・ドル建て株価・前日比(%)が表示される', async ({
  page,
}) => {
  await login(page);

  const firstCard = page.locator('[data-testid="stock-card"]').first();
  await expect(firstCard.locator('[data-testid="stock-name"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-price-jpy"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-price-usd"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-change-percent"]')).toBeVisible();
});

// @SC-4: 両システムに存在する銘柄は2システムの平均値が表示される
// トヨタ自動車: A=350000, B=360000 → BFF平均=355000 → 表示: ¥355,000
test('SC-4: 両システムに存在する銘柄は2システムの平均値が表示される', async ({ page }) => {
  await login(page);

  const toyotaCard = page
    .locator('[data-testid="stock-card"]')
    .filter({ has: page.locator('text=トヨタ自動車') });

  // 100株あたり平均: (350000 + 360000) / 2 = 355,000
  await expect(toyotaCard.locator('[data-testid="stock-price-jpy"]')).toContainText('355,000');
  // 100株あたり平均: (2400 + 2600) / 2 = 2500 (USD は toFixed(2) のため千区切りなし)
  await expect(toyotaCard.locator('[data-testid="stock-price-usd"]')).toContainText('2500');
});

// @SC-5: 片方のシステムにのみ存在する銘柄はその値がそのまま表示される
// キーエンス: Aのみ price_jpy=4000000 → 表示: ¥4,000,000
test('SC-5: 片方のシステムにのみ存在する銘柄はその値がそのまま表示される', async ({ page }) => {
  await login(page);

  const keyenceCard = page
    .locator('[data-testid="stock-card"]')
    .filter({ has: page.locator('text=キーエンス') });

  // A のみ: price_jpy=4000000 → そのまま表示
  await expect(keyenceCard.locator('[data-testid="stock-price-jpy"]')).toContainText('4,000,000');
  await expect(keyenceCard.locator('[data-testid="stock-price-usd"]')).toContainText('27000');
});

// @SC-6: 両システムともAPIエラー時に「現在株価を表示できません。」が表示される
test('SC-6: 両システムともAPIエラー時に「現在株価を表示できません。」が表示される', async ({
  page,
}) => {
  // ダウンストリームサーバーをエラーモードに切替（BFF が 500 を受け取り InternalServerErrorException を throw）
  await Promise.all([
    fetch(`${MOCK_ADMIN_A}/force-error`, { method: 'POST' }),
    fetch(`${MOCK_ADMIN_B}/force-error`, { method: 'POST' }),
  ]);

  await login(page);

  await expect(page.locator('[data-testid="stocks-error"]')).toContainText(
    '現在株価を表示できません。',
  );
});

// @SC-7: 株価一覧ページで株価カードがデフォルトで値上がり順（1列）に表示される
// 値上がり順 (changePercent 降順・同率は五十音順):
//   1位: 任天堂 (+2.4%)
//   2位: トヨタ自動車 (+1.6%)
//   3位: ソフトバンク (+0.6%)
//   4位: キーエンス (+0.3%)
//   5位: ソニーグループ (-0.7%)
test('SC-7: 株価一覧ページで株価カードがデフォルトで値上がり順（1列）に表示される', async ({
  page,
}) => {
  // Arrange
  await login(page);

  // Act
  await page.click('text=その他の株価を見る');
  await page.waitForURL('/stocks');
  await page.waitForLoadState('networkidle');

  // Assert
  await expect(page).toHaveURL('/stocks');
  await expect(page.locator('[data-testid="sort-select"]')).toHaveValue('gain');

  const stockCards = page.locator('[data-testid="stocks-list"] [data-testid="stock-card"]');
  await expect(stockCards).toHaveCount(5);

  await expect(stockCards.first().locator('[data-testid="stock-name"]')).toContainText('任天堂');
  await expect(stockCards.last().locator('[data-testid="stock-name"]')).toContainText(
    'ソニーグループ',
  );
});

// @SC-8: 並び替えドロップダウンで値下がり順を選択すると表示順が変わる
// 値下がり順 (changePercent 昇順・同率は五十音順):
//   1位: ソニーグループ (-0.7%)
//   2位: キーエンス (+0.3%)
//   3位: ソフトバンク (+0.6%)
//   4位: トヨタ自動車 (+1.6%)
//   5位: 任天堂 (+2.4%)
test('SC-8: 並び替えドロップダウンで値下がり順を選択すると表示順が変わる', async ({ page }) => {
  // Arrange
  await login(page);

  // Act
  await page.click('text=その他の株価を見る');
  await page.waitForURL('/stocks');
  await page.waitForLoadState('networkidle');
  await page.selectOption('[data-testid="sort-select"]', 'loss');

  // Assert
  const stockCards = page.locator('[data-testid="stocks-list"] [data-testid="stock-card"]');
  await expect(stockCards.first().locator('[data-testid="stock-name"]')).toContainText(
    'ソニーグループ',
  );
  await expect(stockCards.last().locator('[data-testid="stock-name"]')).toContainText('任天堂');
});

// チャートページの URL（トヨタ自動車）
const TOYOTA_CHART_URL = '/stocks/%E3%83%88%E3%83%A8%E3%82%BF%E8%87%AA%E5%8B%95%E8%BB%8A/chart';

// @SC-9: トップページのカードをクリックするとチャートページに遷移する
test('SC-9: トップページのカードをクリックするとチャートページに遷移する', async ({ page }) => {
  // Arrange
  await login(page);

  // Act: トヨタ自動車の株価カードをクリック
  const toyotaCard = page
    .locator('[data-testid="stock-card"]')
    .filter({ has: page.locator('text=トヨタ自動車') });
  await toyotaCard.click();

  // Assert: チャートページへ遷移する
  await expect(page).toHaveURL(TOYOTA_CHART_URL);
});

// @SC-10: 株価一覧ページの「チャート」ボタンからチャートページに遷移する
test('SC-10: 株価一覧ページの「チャート」ボタンからチャートページに遷移する', async ({
  page,
}) => {
  // Arrange
  await login(page);
  await page.click('text=その他の株価を見る');
  await page.waitForURL('/stocks');
  await page.waitForLoadState('networkidle');

  // Act: トヨタ自動車の「チャート」ボタンをクリック
  const toyotaCard = page
    .locator('[data-testid="stock-card"]')
    .filter({ has: page.locator('text=トヨタ自動車') });
  await toyotaCard.locator('[data-testid="chart-button"]').click();

  // Assert: チャートページへ遷移する
  await expect(page).toHaveURL(TOYOTA_CHART_URL);
});

// @SC-11: チャートページでデフォルト6ヶ月のチャートが表示される
test('SC-11: チャートページでデフォルト6ヶ月のチャートが表示される', async ({ page }) => {
  // Arrange
  await login(page);
  await page.goto(TOYOTA_CHART_URL);
  await page.waitForLoadState('networkidle');

  // Assert: チャートが表示される
  await expect(page.locator('[data-testid="stock-chart"]')).toBeVisible();

  // Assert: デフォルトの表示期間が「6ヶ月」(value="6m") である
  await expect(page.locator('[data-testid="chart-period-select"]')).toHaveValue('6m');

  // Assert: X軸の目盛りが yyyy/mm 形式・毎月（6件）で表示される
  const ticks6m = page.locator('[data-testid="chart-x-tick"]');
  await expect(ticks6m.first()).toBeVisible();
  const tick6mText = await ticks6m.first().textContent();
  expect(tick6mText).toMatch(/^\d{4}\/\d{2}$/);
  await expect(ticks6m).toHaveCount(6);
});

// @SC-12: 表示期間を「1年」に切り替えるとチャートが変わる
test('SC-12: 表示期間を「1年」に切り替えるとチャートが変わる', async ({ page }) => {
  // Arrange
  await login(page);
  await page.goto(TOYOTA_CHART_URL);
  await page.waitForLoadState('networkidle');

  // Act: 表示期間を「1年」に切り替える
  await page.selectOption('[data-testid="chart-period-select"]', '1y');
  await page.waitForLoadState('networkidle');

  // Assert: チャートが表示される
  await expect(page.locator('[data-testid="stock-chart"]')).toBeVisible();

  // Assert: セレクトの値が「1年」(value="1y") になっている
  await expect(page.locator('[data-testid="chart-period-select"]')).toHaveValue('1y');

  // Assert: X軸の目盛りが yyyy/mm 形式・2ヶ月間隔（約6件）で表示される
  const ticks1y = page.locator('[data-testid="chart-x-tick"]');
  await expect(ticks1y.first()).toBeVisible();
  const tick1yText = await ticks1y.first().textContent();
  expect(tick1yText).toMatch(/^\d{4}\/\d{2}$/);
  await expect(ticks1y).toHaveCount(6);
});

// @SC-13: 表示期間を「2年」に切り替えるとチャートが変わる
test('SC-13: 表示期間を「2年」に切り替えるとチャートが変わる', async ({ page }) => {
  // Arrange
  await login(page);
  await page.goto(TOYOTA_CHART_URL);
  await page.waitForLoadState('networkidle');

  // Act: 表示期間を「2年」に切り替える
  await page.selectOption('[data-testid="chart-period-select"]', '2y');
  await page.waitForLoadState('networkidle');

  // Assert: チャートが表示される
  await expect(page.locator('[data-testid="stock-chart"]')).toBeVisible();

  // Assert: セレクトの値が「2年」(value="2y") になっている
  await expect(page.locator('[data-testid="chart-period-select"]')).toHaveValue('2y');

  // Assert: X軸の目盛りが yyyy/mm 形式・4ヶ月間隔（約6件）で表示される
  const ticks2y = page.locator('[data-testid="chart-x-tick"]');
  await expect(ticks2y.first()).toBeVisible();
  const tick2yText = await ticks2y.first().textContent();
  expect(tick2yText).toMatch(/^\d{4}\/\d{2}$/);
  await expect(ticks2y).toHaveCount(6);
});

// @SC-14: 表示期間を「10年」に切り替えるとチャートが変わる
test('SC-14: 表示期間を「10年」に切り替えるとチャートが変わる', async ({ page }) => {
  // Arrange
  await login(page);
  await page.goto(TOYOTA_CHART_URL);
  await page.waitForLoadState('networkidle');

  // Act: 表示期間を「10年」に切り替える
  await page.selectOption('[data-testid="chart-period-select"]', '10y');
  await page.waitForLoadState('networkidle');

  // Assert: チャートが表示される
  await expect(page.locator('[data-testid="stock-chart"]')).toBeVisible();

  // Assert: セレクトの値が「10年」(value="10y") になっている
  await expect(page.locator('[data-testid="chart-period-select"]')).toHaveValue('10y');

  // Assert: X軸の目盛りが yyyy 形式・毎年（10件）で表示される
  const ticks10y = page.locator('[data-testid="chart-x-tick"]');
  await expect(ticks10y.first()).toBeVisible();
  const tick10yText = await ticks10y.first().textContent();
  expect(tick10yText).toMatch(/^\d{4}$/);
  await expect(ticks10y).toHaveCount(10);
});

// @SC-15: チャートAPIエラー時に「現在チャートを表示できません。」が表示される
test('SC-15: チャートAPIエラー時に「現在チャートを表示できません。」が表示される', async ({
  page,
}) => {
  // Arrange: チャート専用エラーモードをオンにする
  await Promise.all([
    fetch(`${MOCK_ADMIN_A}/force-chart-error`, { method: 'POST' }),
    fetch(`${MOCK_ADMIN_B}/force-chart-error`, { method: 'POST' }),
  ]);

  // Act: チャートページを開く
  await login(page);
  await page.goto(TOYOTA_CHART_URL);
  await page.waitForLoadState('networkidle');

  // Assert: エラーメッセージが表示される
  await expect(page.locator('[data-testid="chart-error"]')).toContainText(
    '現在チャートを表示できません。',
  );

  // Cleanup: チャート専用エラーモードをオフにする
  await clearChartErrorMode();
});
