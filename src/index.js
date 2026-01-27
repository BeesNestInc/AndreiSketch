
import Fastify from 'fastify';
import cors from '@fastify/cors';
import duckdb from 'duckdb';
import { format } from '@formkit/tempo';

const fastify = Fastify({
  logger: true
});

// CORSを有効にする
fastify.register(cors, {
  origin: '*', // 本番環境ではより厳密な設定が必要です
});

let db;

const initializeDatabase = async () => {
  try {
    db = new duckdb.Database(':memory:');
    
    // DuckDBの非同期接続・クエリ実行用のラッパー
    const query = (sql) => new Promise((resolve, reject) => {
      db.all(sql, (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });

    fastify.log.info('DuckDB database initialized.');

    await query('INSTALL postgres; LOAD postgres;');
    fastify.log.info('Postgres extension installed and loaded.');

    // ！！！注意！！！
    // 本番環境では環境変数などを使って安全に資格情報を管理してください。
    const pgConnectString = "dbname=amazon user=ogochan host=10.2.254.11 port=5432 password=ogochan";
    await query(`ATTACH '${pgConnectString}' AS onprem_pg (TYPE POSTGRES);`);
    
    fastify.log.info('Attached to on-premise PostgreSQL database.');

  } catch (err) {
    fastify.log.error({err}, 'Failed to initialize database or attach to Postgres.');
    // データベース初期化に失敗したら、プロセスを終了する
    process.exit(1);
  }
};

// /api/query エンドポイント
fastify.post('/api/query', async (request, reply) => {
  const { sql } = request.body;
  if (!sql) {
    return reply.status(400).send({ error: 'SQL query is required.' });
  }

  try {
    const results = await new Promise((resolve, reject) => {
      db.all(sql, (err, res) => {
        if (err) {
          return reject(err);
        }
        
        // BigIntとDateをJSONでシリアライズ可能な形式に変換
        const processedRes = res.map(row => {
          const newRow = {};
          for (const key in row) {
            const value = row[key];
            if (typeof value === 'bigint') {
              newRow[key] = value.toString();
            } else if (value instanceof Date) {
              newRow[key] = format(value, 'YYYY-MM-DD HH:mm:ss');
            } else {
              newRow[key] = value;
            }
          }
          return newRow;
        });
        resolve(processedRes);
      });
    });
    reply.send(results);
  } catch (err) {
    fastify.log.error({ msg: 'Error executing query', sql, err });
    reply.status(500).send({ error: 'Failed to execute query.', details: err.message });
  }
});

// サーバーの起動
const start = async () => {
  try {
    await initializeDatabase();
    // Observable Frameworkのプレビューサーバーが3333ポートを使うので、
    // サーバーは別のポート（例: 3000）で起動します。
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
