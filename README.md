# Slides

発表スライドを管理するモノレポ

## セットアップ

```bash
bun install
```

## 使い方

### 開発モード（スライドを編集しながらプレビュー）

dev は対話キー (`r`/`o`/`e`/`q`) を使うので、`--filter` ではなく `cd` で実行する。

```bash
cd rubykaigi-bootcamp-2025 && bun run dev
cd camp-lt-2025-oct        && bun run dev
```

### ビルド

```bash
bun --filter='./rubykaigi-bootcamp-2025' run build
bun --filter='./camp-lt-2025-oct'        run build

# 全スライドまとめてビルド
bun --filter='*' run build
```

### PDFエクスポート

```bash
bun --filter='./rubykaigi-bootcamp-2025' run export
bun --filter='./camp-lt-2025-oct'        run export
```

## スライド一覧

| パッケージ名 | ディレクトリ |
|-------------|-------------|
| rubykaigi-bootcamp-2025 | rubykaigi-bootcamp-2025/ |
| rubykaigi-bootcamp-2026 | rubykaigi-bootcamp-2026/ |
| camp-lt-2025-oct | camp-lt-2025-oct/ |
| zentaikai-2026-jan | zentaikai-2026-jan/ |
| wakaterb-2026-jun | wakaterb-2026-jun/ |

## 新しいスライドを追加する

```bash
bun run init:slide my-new-slide
bun install
cd my-new-slide && bun run dev
```
