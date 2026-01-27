1. Node.js + Fastifyを使用すること。
2. DB接続には `duckdb` ライブラリを使用。`postgres` 拡張をロードし、`ATTACH`文でオンプレPostgreSQLに接続する。
3. POSTされたSQLをDBで実行し、JSONで返す `/api/query` エンドpointを作成。
4. (未実装) POSTされたJSコード文字列をサーバー側で安全に（vmモジュール等で）実行し結果を返す `/api/execute-js` エンドポイントを作成（Jupyterのカーネル相当）。
5. フロントからのアクセスを許可するためCORSを有効にすること。