1. Node.js + Fastifyを使用すること。
2. PostgreSQL接続には pg ライブラリを使用。
3. POSTされたSQLをDBで実行し、JSONで返す /api/query エンドポイントを作成。
4. POSTされたJSコード文字列をサーバー側で安全に（vmモジュール等で）実行し結果を返す /api/calculate エンドポイントを作成（Jupyterのカーネル相当）。
5. フロントからのアクセスを許可するためCORSを有効にすること。