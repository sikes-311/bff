# 開発ルール

## 共通ルール

### 言語・型
- **TypeScript strict モード**必須 (`"strict": true`)
- `any` 型の使用禁止。どうしても必要な場合は `// eslint-disable-next-line @typescript-eslint/no-explicit-any` コメントと理由を記載
- 型は可能な限り `interface` より `type` を優先（Union型・交差型で柔軟性を確保）
- 外部API・ユーザー入力の型は Zod (frontend) / class-validator (bff) で実行時バリデーション

### コードスタイル
- **ESLint + Prettier** 必須（コミット前に自動チェック）
- インデント: スペース2つ
- セミコロン: あり
- クォート: シングルクォート
- 末尾カンマ: あり (trailing comma)
- 最大行長: 100文字

### 命名規則
| 対象 | 規則 | 例 |
|------|------|-----|
| ファイル (TS) | kebab-case | `user-profile.service.ts` |
| クラス | PascalCase | `UserProfileService` |
| 関数・変数 | camelCase | `getUserProfile` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 型・インターフェース | PascalCase | `UserProfile`, `ApiResponse<T>` |
| Enum | PascalCase (値はUPPER_SNAKE_CASE) | `UserRole.ADMIN` |

### コミットメッセージ (Conventional Commits)
```
<type>(<scope>): <subject>

<body>  # 必要な場合のみ
```

**type一覧:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの動作に影響しない変更（フォーマット等）
- `refactor`: バグ修正でも機能追加でもないコード変更
- `test`: テストの追加・修正
- `chore`: ビルドプロセス・補助ツールの変更

**例:**
```
feat(auth): JWTリフレッシュトークン機能を追加
fix(bff): ユーザー一覧APIのページネーションを修正
test(frontend): ユーザープロフィールコンポーネントのテストを追加
```

---

## Backend (NestJS BFF) ルール

### モジュール設計
- 1機能 = 1モジュール (`{feature}.module.ts`)
- モジュールの依存は `AppModule` が管理
- モジュール間の直接インポートは禁止。`AppModule` 経由で解決

### Controller
- HTTPリクエスト/レスポンスのみを担当
- ビジネスロジックは Service に委譲
- 必ず `@ApiTags`, `@ApiOperation`, `@ApiResponse` デコレータを付与（Swagger）
- DTOで入力バリデーション

```typescript
// ✅ Good
@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'ユーザー一覧取得' })
  @ApiResponse({ status: 200, type: GetUsersResponseDto })
  async getUsers(@Query() query: GetUsersQueryDto): Promise<GetUsersResponseDto> {
    return this.usersService.getUsers(query);
  }
}

// ❌ Bad - ビジネスロジックをControllerに書かない
@Get()
async getUsers() {
  const users = await this.httpService.get('/users');
  return users.data.map(u => ({ ...u, fullName: `${u.firstName} ${u.lastName}` }));
}
```

### Service
- ビジネスロジック・ダウンストリーム通信を担当
- `HttpService` を使いダウンストリームサービスを呼び出す
- エラーは適切な NestJS 例外（`NotFoundException`, `BadRequestException` 等）に変換

```typescript
// ✅ Good - エラーハンドリング
async getUser(id: string): Promise<UserDto> {
  try {
    const response = await firstValueFrom(
      this.httpService.get<UserDto>(`/users/${id}`)
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new NotFoundException(`ユーザー(id=${id})が見つかりません`);
    }
    throw new InternalServerErrorException('ユーザー取得に失敗しました');
  }
}
```

### DTO
- `class-validator` + `class-transformer` を使用
- Request DTO: `{action}{Resource}Dto` (例: `CreateUserDto`, `GetUsersQueryDto`)
- Response DTO: `{Resource}ResponseDto` (例: `UserResponseDto`)

```typescript
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @ApiProperty({ description: 'ユーザー名', example: 'John' })
  name: string;

  @IsEmail()
  @ApiProperty({ description: 'メールアドレス', example: 'john@example.com' })
  email: string;
}
```

### エラーハンドリング
- 全例外は `GlobalExceptionFilter` で統一フォーマットに変換
- 想定内エラー: NestJS標準例外を使用
- 想定外エラー: `InternalServerErrorException` に変換してログ記録

### テスト (BFF)
- **Unit Test**: Domain・Usecase・Gateway・Controller ごとに作成 (`*.spec.ts`)
- ダウンストリームサービス（Gateway）は **Jest モック** で差し替え
- カバレッジ目標: 80%以上

---

## Frontend (Next.js) ルール

### コンポーネント設計
- **Server Component を優先**。インタラクティブな部分のみ `'use client'`
- コンポーネントは `src/components/` 配下に配置
  - `ui/`: ボタン、入力フォームなど汎用UIパーツ
  - `features/`: ドメイン固有コンポーネント
- Props の型は必ず定義

```typescript
// ✅ Good
type UserCardProps = {
  user: User;
  onSelect?: (id: string) => void;
};

export function UserCard({ user, onSelect }: UserCardProps) { ... }
```

### データフェッチ
- Server Component: `fetch()` 直接呼び出し（キャッシュ制御付き）
- Client Component: **TanStack Query** (`useQuery`, `useMutation`)
- BFF への API コールは `src/lib/api/` に集約

```typescript
// src/lib/api/users.ts
export async function fetchUsers(params: GetUsersParams): Promise<UsersResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/users`, {
    next: { revalidate: 60 }, // 60秒キャッシュ
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

### ページ・ルーティング
- App Router 使用
- ページは `src/app/` 配下
- 機能別に Route Group `(feature)` でまとめる

### 状態管理
- グローバル状態は最小限に（まずは React の `useState` / `useReducer`）
- サーバー状態は TanStack Query で管理
- 認証状態は React Context

### エラーハンドリング
- ページレベル: `error.tsx` + `not-found.tsx`
- コンポーネントレベル: `try/catch` + `toast` 通知

### テスト (Frontend)
- **Unit Test**: コンポーネント・フックのユニットテスト (`*.test.tsx` / `*.test.ts`) - Vitest + Testing Library
- モック境界:
  - **コンポーネントテスト**: フック層でモック (`vi.mock('@/hooks/use-xxx')`) — コンポーネントの描画ロジックに集中
  - **フックテスト**: API関数層でモック (`vi.mock('@/lib/api/xxx')`) — React Query の状態管理ロジックをテスト
- MSW は使用しない（jsdom 環境では axios の XHR アダプターが MSW Node インターセプターに届かないため）
- カバレッジ目標: 70%以上

### テスト (E2E)
- **Playwright**: `frontend/e2e/` で管理 — フロントエンド・BFF は実サーバー、ダウンストリームのみ `mock-server.mjs` でモック
- E2E テストは BDD シナリオ（SC-1, SC-2, ...）と 1:1 で対応させる
- `data-testid` 属性を通じてセレクターを安定させる

---

## テストルール（共通）

### テスト命名
```typescript
describe('UserService', () => {
  describe('getUser', () => {
    it('正常系: IDに対応するユーザーを返す', async () => { ... });
    it('異常系: 存在しないIDの場合はNotFoundExceptionをスロー', async () => { ... });
  });
});
```

### テスト構造 (AAA パターン)
```typescript
it('正常系: ユーザーを作成できる', async () => {
  // Arrange
  const createDto = { name: 'Test', email: 'test@example.com' };

  // Act
  const result = await service.createUser(createDto);

  // Assert
  expect(result.id).toBeDefined();
  expect(result.name).toBe('Test');
});
```

### モック方針

| テスト種別 | モック境界 | 実サーバー |
|---|---|---|
| BFF Unit Test | Gateway（jest.fn() で差し替え） | Domain / Usecase / Controller |
| Frontend Component Test | フック層（vi.mock '@/hooks/use-xxx'） | コンポーネント |
| Frontend Hook Test | API関数層（vi.mock '@/lib/api/xxx'） | フック・React Query |
| E2E (Playwright) | Downstream のみ（mock-server.mjs） | Frontend / BFF / Auth |

- `jest.clearAllMocks()` / `vi.clearAllMocks()` を `beforeEach` で実行

---

## CI/CD (GitHub Actions)

```yaml
# プッシュ・PR時に実行
- lint: ESLint チェック
- type-check: tsc --noEmit
- test: Jest / Vitest でテスト実行
- build: ビルド成功確認
```

---

## ローカル開発

```bash
# 全サービス起動
docker-compose up

# 個別起動
cd bff && npm run start:dev   # BFF: http://localhost:3001
cd frontend && npm run dev     # Frontend: http://localhost:3000

# Swagger UI
open http://localhost:3001/api
```
