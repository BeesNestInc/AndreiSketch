# タスク：多言語実行基盤への拡張（履歴管理への布石）

## 1. サーバーサイド (src/index.js) の拡張
- エンドポイントを `/api/execute` に集約し、拡張可能な Strategy パターン的な構造にする。
- リクエスト形式: `{ language: string, code: string }`
- 言語ごとの処理を以下のように実装：
  - `sql`: DuckDB (Postgres ATTACH済み) で実行し、結果を JSON 配列で返す。
  - `js-server`: Node.js の `vm` モジュールで実行。`tempo` ライブラリをコンテキストに注入しておく。
- 将来、言語を増やす際（例: python-wasm）に、この `switch` 文やオブジェクトにハンドラーを追加するだけで済むようにリファクタリングする。

## 2. フロントエンド (front/svelte/Editor.svelte) の拡張
- Svelte 5 の Runes (`$state`) を使用。
- 言語選択用ドロップダウン (Select) を追加。
  - 選択肢: `SQL`, `JS (Server)`, `JS (Client)`
- 「実行」ボタンの挙動：
  - `js-client` の場合：サーバーへ飛ばさず、ブラウザ側で `new Function()` を用いて実行。`Observable Plot` や `Tempo` にアクセス可能にする。
  - それ以外の場合：サーバーの `/api/execute` へ POST し、結果を表示エリアに反映。
- 実行結果のデータ構造を、次回の「履歴管理」実装を見据えて `{ type: language, data: result, timestamp: ... }` のようなオブジェクトで管理し始める。

## 3. 実装のポイント
- クライアント側 JS 実行時、直前の SQL 実行結果がある場合はそれを `data` 変数として参照できるようにする。
- 依存ライブラリの追加は不要（既存の Fastify, DuckDB, Tempo, Observable Plot を活用）。
- コード生成後、本日の変更内容と「ちまちました問題」の修正箇所を「作業日誌」として記録する。
