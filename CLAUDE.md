# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語設定
**この会話以降、すべての対話は日本語で行います。**

## プロジェクト概要
ナイトクラブ/スナック向けSaaS - 会計・勤怠・売上管理システム。高級感のあるUIテーマ（ワインレッド#7A001F × ゴールド#C9A227）。現在、静的HTML/CSS/JSからNext.js + TypeScript + Tailwind + shadcn/uiへ移行中。

## エージェント役割分担
- **メインコーダー（Claude）**: 全体のバイブコーディング（ペアプログラミング）、実装、アーキテクチャ設計
- **テスター（CODEX）**: 各コードのテスト実行、デバッグ、動作検証
- **Serena MCP**: ディレクトリ参照、シンボル検索、コード解析の支援

## Development Commands

### Initial Setup
```bash
# Create Next.js project with TypeScript, ESLint, Tailwind (App Router)
npx create-next-app@latest nightclub-saas --typescript --eslint --tailwind --app --src-dir --import-alias "@/*"
cd nightclub-saas

# Install core dependencies
npm i lucide-react clsx tailwind-merge @radix-ui/react-icons
npm i react-hook-form zod @hookform/resolvers
npm i date-fns date-fns-tz @tanstack/react-table

# Setup shadcn/ui (use default settings, components dir: "components/ui")
npx shadcn@latest init

# Add shadcn components
npx shadcn@latest add button card input label select textarea switch dialog sheet dropdown-menu
npx shadcn@latest add table badge tabs toast skeleton navigation-menu separator avatar tooltip breadcrumb

# Dev dependencies
npm i -D prettier prettier-plugin-tailwindcss vitest @testing-library/react @testing-library/jest-dom playwright
```

### Daily Development
```bash
cd nightclub-saas
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # Run ESLint
npm run format     # Run Prettier (if configured)
npx vitest        # Run tests in watch mode
npx vitest run    # Run tests once
npx playwright test # Run E2E tests
```

### Adding UI Components
```bash
npx shadcn@latest add [component-name]  # Add new shadcn/ui component
```

## Architecture & Structure

```
nightclub-saas/
├── src/
│   ├── app/                    # App Router pages & API routes
│   │   ├── layout.tsx          # Root layout with AppShell
│   │   ├── page.tsx            # Home (redirects to dashboard)
│   │   ├── dashboard/          # Dashboard with KPIs
│   │   ├── attendance/         # 勤怠管理 (attendance tracking)
│   │   ├── receipts/           # 伝票管理 (receipt management)  
│   │   ├── settings/           # 設定 (settings)
│   │   └── api/                # API routes & Server Actions
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-shell.tsx   # Main layout wrapper
│   │   │   └── side-nav.tsx    # Sidebar navigation
│   │   ├── forms/              # Form components (RHF + Zod)
│   │   ├── data-table/         # Table components (@tanstack)
│   │   └── ui/                 # shadcn/ui components
│   └── lib/
│       ├── types.ts            # TypeScript domain types
│       ├── format.ts           # JPY/date formatting utilities
│       └── mock.ts             # Mock data for development
├── public/                     # Static assets
├── tailwind.config.ts          # Theme configuration
└── package.json
```

## Key Technical Decisions

### Styling & Theme
- **Primary Color**: Wine Red `#7A001F`
- **Accent Color**: Gold `#C9A227`
- **Background**: Dark `#0F0D10`
- Use Tailwind utility classes exclusively
- Configure theme in `tailwind.config.ts`
- Dark mode by default with toggle

### Data & State
- Mock data in `src/lib/mock.ts` (no backend yet)
- Server Components by default, `"use client"` when needed
- React Hook Form + Zod for forms
- @tanstack/react-table for data tables

### Formatting
- Currency: Use `Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" })`
- Dates: Use `date-fns` with JST timezone
- All text in Japanese

### Type Safety
- Strict TypeScript, no `any` types
- Domain types in `src/lib/types.ts`
- Zod schemas for form validation

## Core Features (MVP)

1. **Dashboard** (`/dashboard`)
   - KPI cards: 本日売上, 月間売上, 平均客単価
   - Recent receipts table
   
2. **Attendance** (`/attendance`)
   - Clock in/out form
   - Attendance records table
   
3. **Receipts** (`/receipts`)
   - Receipt list with filters
   - Receipt detail modal
   - Service charge & tax calculations
   
4. **Settings** (`/settings`)
   - Store information
   - Branding configuration

## Migration Guidelines

When migrating from existing HTML/CSS/JS:
1. Convert HTML to React components (class → className, onclick → onClick)
2. Replace inline styles with Tailwind classes
3. Replace DOM manipulation with React state
4. Import existing CSS temporarily in `globals.css` if needed
5. Gradually refactor to Tailwind utilities

## Testing Strategy
- Unit tests: Components and utilities with Vitest
- Integration: Key user flows with Testing Library
- E2E: Critical paths with Playwright
- Focus on: Receipt calculations, date/time handling, form validation

## Future Considerations (Post-MVP)
- Auth.js integration with passkey support
- Stripe payment integration
- PDF generation for receipts/invoices
- Multi-tenant architecture with RLS
- i18n with next-intl

## Git設定とワークフロー

### 初期Git設定
```bash
# ユーザー情報設定（プロジェクト毎）
git config user.name "Your Name"
git config user.email "your.email@example.com"

# デフォルトブランチをmainに設定
git config --global init.defaultBranch main

# 日本語ファイル名の文字化け防止
git config core.quotepath false

# 改行コードの自動変換設定（Windows環境）
git config core.autocrlf true
```

### ブランチ戦略
- `main`: プロダクション環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正
- `test/*`: テスト専用

### コミットルール
```bash
# Conventional Commits形式
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル変更
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・補助ツール変更
```

### 基本的なGitワークフロー
```bash
# 1. 新機能開発の開始
git checkout -b feature/[機能名]

# 2. 変更の追加とコミット
git add .
git commit -m "feat: [機能説明]"

# 3. リモートへプッシュ
git push -u origin feature/[機能名]

# 4. プルリクエスト作成（GitHub/GitLab）
# ブラウザでPR作成、またはCLIツール使用
gh pr create --title "feat: [機能名]" --body "[説明]"
```

## Serena MCP連携設定

### プロジェクト設定ファイル作成
`.serena/project.yml`を以下の内容で作成：
```yaml
project_name: nightclub-saas
language: typescript
root_path: ./nightclub-saas
include_patterns:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "*.config.ts"
  - "*.config.js"
exclude_patterns:
  - "node_modules/**"
  - ".next/**"
  - "dist/**"
```

### Serena利用方法
```bash
# プロジェクトのアクティベート
mcp__serena__activate_project /mnt/c/Users/USER/Desktop/nightclubsaas/nightclub-saas

# シンボル検索例
mcp__serena__find_symbol "AppShell"
mcp__serena__get_symbols_overview "src/app/layout.tsx"

# パターン検索
mcp__serena__search_for_pattern "useState"
```

## 開発フロー

### 1. 実装フェーズ（Claude担当）
- 機能設計とアーキテクチャ決定
- コンポーネント実装
- ビジネスロジック実装
- 型定義とインターフェース設計

### 2. テストフェーズ（CODEX担当）
- ユニットテスト作成・実行
- 統合テスト実施
- E2Eテスト実施
- バグレポート作成

### 3. レビュー・修正フェーズ
- コードレビュー実施
- リファクタリング
- パフォーマンス最適化
- ドキュメント更新