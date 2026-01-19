# Slides

発表スライドを管理するモノレポ

## セットアップ

```bash
pnpm install
```

## 使い方

### 開発モード（スライドを編集しながらプレビュー）

```bash
pnpm --filter @slides/rubykaigi-bootcamp-2025 dev
pnpm --filter @slides/camp-lt-2025-oct dev
```

### ビルド

```bash
pnpm --filter @slides/rubykaigi-bootcamp-2025 build
pnpm --filter @slides/camp-lt-2025-oct build
```

### PDFエクスポート

```bash
pnpm --filter @slides/rubykaigi-bootcamp-2025 export
pnpm --filter @slides/camp-lt-2025-oct export
```

## スライド一覧

| パッケージ名 | ディレクトリ |
|-------------|-------------|
| @slides/rubykaigi-bootcamp-2025 | rubykaigi-bootcamp-2025/ |
| @slides/camp-lt-2025-oct | Camp-LT-2025-Oct/ |

## 新しいスライドを追加する

1. ルートに新しいディレクトリを作成
2. `package.json` を作成：
   ```json
   {
     "name": "@slides/your-slide-name",
     "type": "module",
     "private": true,
     "scripts": {
       "dev": "slidev --open",
       "build": "slidev build",
       "export": "slidev export"
     }
   }
   ```
3. `slides.md` を作成
4. `pnpm-workspace.yaml` にディレクトリ名を追加
5. `pnpm install` を実行
