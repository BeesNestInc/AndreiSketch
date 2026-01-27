# タスク：オンプレPostgres直結Jupyter基盤の最小構成構築

## 目的
Node.js (Fastify) からオンプレPostgresをDuckDB経由でマウントし、
フロント (Svelte 5) からSQLを投げて結果を表示する最小限の「一気通貫」を確認する。

## 1. サーバー側実装 (src/index.js)
- Fastifyで `/api/query` (POST) を作成。
- DuckDBを初期化し、`INSTALL postgres; LOAD postgres;` を実行。
- `ATTACH` 文を使用して、オンプレPostgres (`10.2.254.11:5432/amazon`) をマウント。
- クライアントから届いたSQLをDuckDBで実行し、JSONで返す。
- 日付処理は常に `@formkit/tempo` を通してISO文字列として扱う。

## 2. フロント側実装 (front/svelte/Editor.svelte)
- Svelte 5 の `$state` を使用。
- 簡易的なテキストエリアと「実行」ボタンを配置。
- `/api/query` へSQLをfetchし、結果を `<table>` で表示。
- エラーハンドリング（DB接続エラー等）を画面に表示する。

## 3. 確認事項
- `npm run dev` 相当の起動手順を提示すること。
- 作業完了後、「作業日誌」を生成し、本セッションの内容を要約して出力すること。
