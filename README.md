# Slides

発表スライドを管理するモノレポ

## セットアップ

```bash
bun install
```

## 使い方

### 開発モード（スライドを編集しながらプレビュー）

```bash
bun --filter='./rubykaigi-bootcamp-2025' run dev
bun --filter='./camp-lt-2025-oct'        run dev
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

> bun の `--filter` は **`'./folder'`** か **`'*'`** の形でしか効かない（exact name 指定が壊れている [oven-sh/bun#10322](https://github.com/oven-sh/bun/issues/10322)）。
> また `./folder` で動かすには **フォルダ名と package.json の `name` フィールドが完全一致**している必要があるので、新規スライドは必ず小文字のディレクトリ名で作成する（`init:slide` が自動で小文字化する）。

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
bun --filter='./my-new-slide' run dev
```
