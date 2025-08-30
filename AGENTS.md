# Repository Guidelines

## Project Structure & Module Organization
- `nightclub-saas/`: Next.js (App Router), TypeScript, Tailwind, shadcn/ui.
  - `src/app/**`: Routes (`/dashboard`, `/attendance`, `/receipts`, `/settings`).
  - `src/components/ui/**`: Shared UI components.
  - `src/lib/{types,format,mock}.ts`: Types, formatting helpers, mock data.
  - `tailwind.config.ts`, `src/app/globals.css`: Theme tokens (wine‑red × gold).
  - `public/`: Images and static assets.
- Legacy mock at repo root (`index.html`/`app.js`/`style.css`) is reference‑only; do not modify. New work lives in `nightclub-saas/`.

## Build, Test, and Development Commands
- `cd nightclub-saas && npm install`: Install dependencies.
- `npm run dev`: Start local dev server at http://localhost:3000.
- `npm run build`: Create a production build.
- `npm run start`: Run the built app locally.
- `npm run lint` / `npm run format`: Lint and format the codebase.
- `npx shadcn@latest add button card input table`: Scaffold UI components.

## Coding Style & Naming Conventions
- Language: TypeScript with `@/*` import alias.
- Components are server by default; add `"use client"` for client components.
- Naming: Components in PascalCase; utilities in camelCase; keep file names consistent with existing patterns.
- Styling: Prefer Tailwind; use shadcn/ui for base primitives; consume tokens from `tailwind.config.ts`.

## Testing Guidelines
- Unit/Component: Vitest + Testing Library. Place tests under `src/**/*.test.ts(x)`.
- E2E: Playwright when needed.
- Commands: `npx vitest` (watch), `npx vitest run` (CI), `npx playwright test` (E2E).
- Cover key flows: receipts totals/rounding/CSV and settings application. Keep tests deterministic.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits, e.g., `feat(receipts): add receipt table`.
- PRs: clear purpose, concise change summary, UI screenshots, verification steps, and linked issues (e.g., `Closes #123`). Prefer small, focused PRs.

## Security & Configuration
- Store secrets in `.env.local` (untracked). Use environment variables in Vercel/hosting.
- Disable Next telemetry/experiments when unnecessary. Keep assets in `public/`.
- Do not commit real IndexedDB/LocalStorage data from the legacy mock.

## エージェント固有の指示
- 役割: Claude が作成したコード一式に対してテスト・デバッグを実施し、動作・UI・計算ロジック（伝票合計/端数/CSV）を検証します。
- コミュニケーション: 以後のやり取り、レビューコメント、PR説明は日本語で行います。
- 実施内容: `npm run dev` で事前確認、`npm run lint`/`npm run format`、`npx vitest run`（単体/コンポーネント）、必要時 `npx playwright test`（E2E）。バグは再現手順・原因・修正方針・影響範囲を明記します。
- 変更方針: 最小差分で根本原因を修正し、無関係な変更は避けます。既存のコーディング規約/デザインに厳密に合わせます。
- 成果物: 最小再現ケースやスクリーンショット（可能なら）を PR に添付し、検証手順を含めます。
