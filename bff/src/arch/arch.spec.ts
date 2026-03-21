/**
 * Architecture Tests — Dependency Inversion Principle (DIP)
 *
 * ARCHITECTURE.md で定義した依存方向をテストで強制する。
 * 追加ライブラリ不要で、Node.js 組み込みの fs/path のみを使用する。
 *
 * 依存の許可方向（→ は「依存してよい」）:
 *   Controller → Usecase → Port (interface) ← Gateway
 *                    ↓                            ↓
 *                 Domain ←──────────────── (new DomainModel)
 *               （依存ゼロ）
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────

const MODULES_ROOT = path.resolve(__dirname, '..', 'modules');

/** ディレクトリを再帰的に走査し、*.ts ファイル（spec 除く）を収集する */
function collectTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      result.push(fullPath);
    }
  }
  return result;
}

/** ファイル内の相対 import パス一覧を返す（`from './...'` 形式のみ対象）*/
function getRelativeImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /from\s+['"](\.[^'"]+)['"]/g;
  const imports: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

/** パスがディレクトリセグメント segment を含むか判定する */
function pathHasSegment(filePath: string, segment: string): boolean {
  return filePath.split(path.sep).includes(segment);
}

/**
 * 違反を検出する汎用関数。
 * @param sourceFilter   対象ソースファイルの判定関数
 * @param forbiddenFilter 解決済み import パスが禁止対象かを判定する関数
 * @returns 違反メッセージの配列（空なら適合）
 */
function findViolations(
  sourceFilter: (filePath: string) => boolean,
  forbiddenFilter: (resolvedImport: string) => boolean,
): string[] {
  const allFiles = collectTsFiles(MODULES_ROOT);
  const sourceFiles = allFiles.filter(sourceFilter);

  return sourceFiles.flatMap((file) => {
    const imports = getRelativeImports(file);
    return imports
      .filter((imp) => {
        const resolved = path.resolve(path.dirname(file), imp);
        return forbiddenFilter(resolved);
      })
      .map((imp) => `  ${path.relative(MODULES_ROOT, file)} → "${imp}"`);
  });
}

// ─────────────────────────────────────────────────────────────
// フィルタ定義
// ─────────────────────────────────────────────────────────────

/** ファイルが指定ディレクトリセグメント内にあるか */
const inLayer =
  (layer: string) =>
  (filePath: string): boolean =>
    pathHasSegment(filePath, layer);

/** ファイルが *.controller.ts か */
const isController = (filePath: string): boolean =>
  filePath.endsWith('.controller.ts');

/** 解決済み import が指定ディレクトリセグメントを含むか */
const importsFrom =
  (layer: string) =>
  (resolvedPath: string): boolean =>
    pathHasSegment(resolvedPath, layer);

/** 解決済み import が *.controller を指しているか */
const importsController = (resolvedPath: string): boolean =>
  resolvedPath.endsWith('.controller');

// ─────────────────────────────────────────────────────────────
// アーキテクチャテスト
// ─────────────────────────────────────────────────────────────

describe('Architecture: Dependency Inversion Principle (DIP)', () => {
  /**
   * Domain は最内層。
   * Gateway / Usecase / Port のいずれにも依存してはならない。
   */
  describe('Domain層: 外層への依存禁止', () => {
    it('Gateway に依存しないこと', () => {
      const violations = findViolations(inLayer('domain'), importsFrom('gateway'));
      expect(violations).toEqual([]);
    });

    it('Usecase に依存しないこと', () => {
      const violations = findViolations(inLayer('domain'), importsFrom('usecase'));
      expect(violations).toEqual([]);
    });

    it('Port に依存しないこと', () => {
      const violations = findViolations(inLayer('domain'), importsFrom('port'));
      expect(violations).toEqual([]);
    });
  });

  /**
   * Usecase は Port（抽象）を通じてのみ Gateway にアクセスする。
   * Gateway 実装クラスを直接 import してはならない。
   */
  describe('Usecase層: Gateway への直接依存禁止', () => {
    it('Gateway 実装クラスを直接 import しないこと（Port 経由のみ許可）', () => {
      const violations = findViolations(inLayer('usecase'), importsFrom('gateway'));
      expect(violations).toEqual([]);
    });
  });

  /**
   * Gateway は外部通信のみを担当する。
   * Usecase・Controller には依存しない。
   */
  describe('Gateway層: Usecase・Controller への依存禁止', () => {
    it('Usecase に依存しないこと', () => {
      const violations = findViolations(inLayer('gateway'), importsFrom('usecase'));
      expect(violations).toEqual([]);
    });

    it('Controller に依存しないこと', () => {
      const violations = findViolations(inLayer('gateway'), importsController);
      expect(violations).toEqual([]);
    });
  });

  /**
   * Controller は HTTP の入出力のみを担当する。
   * Gateway 実装クラスを直接 import してはならない。
   */
  describe('Controller層: Gateway への直接依存禁止', () => {
    it('Gateway 実装クラスを直接 import しないこと', () => {
      const violations = findViolations(isController, importsFrom('gateway'));
      expect(violations).toEqual([]);
    });
  });
});
