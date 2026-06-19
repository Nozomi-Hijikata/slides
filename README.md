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
cd slides/rubykaigi-bootcamp-2025 && bun run dev
cd slides/camp-lt-2025-oct        && bun run dev
```

### ビルド

```bash
bun --filter='./slides/rubykaigi-bootcamp-2025' run build
bun --filter='./slides/camp-lt-2025-oct'        run build

# 全スライドまとめてビルド
bun --filter='*' run build
```

### PDFエクスポート

```bash
bun --filter='./slides/rubykaigi-bootcamp-2025' run export
bun --filter='./slides/camp-lt-2025-oct'        run export
```

## スライド一覧

| パッケージ名 | ディレクトリ |
|-------------|-------------|
| rubykaigi-bootcamp-2025 | slides/rubykaigi-bootcamp-2025/ |
| rubykaigi-bootcamp-2026 | slides/rubykaigi-bootcamp-2026/ |
| camp-lt-2025-oct | slides/camp-lt-2025-oct/ |
| zentaikai-2026-jan | slides/zentaikai-2026-jan/ |
| wakaterb-2026-jun | slides/wakaterb-2026-jun/ |

## 新しいスライドを追加する

```bash
bun run init:slide my-new-slide
bun install
cd slides/my-new-slide && bun run dev
```
