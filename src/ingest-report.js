import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { pipeline } from "node:stream/promises";
import { Client } from "pg";
import 'dotenv/config';

/**
 * Usage:
 *   node ads-schema/ingest-report.js \
 *     --table sp_campaign_daily \
 *     --bin  ./data/raw/run-xxxx/sp-campaign_....bin \
 *     --profile-id 1234567890 \
 *     --run-id run-xxxx
 *
 * DB:
 *   export DATABASE_URL="postgres://user:pass@host:5432/dbname"
 */

const arg = (name, def = undefined) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  return def;
};

const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const readJson = async (p) => JSON.parse(await fsp.readFile(p, "utf8"));

const normalizeColumn = (c) => ({
  name: c.name,
  type: c.type,
  null: c.null ?? true,
  default: c.default,
  source: c.source,
});

const apiColumnName = (c) => c.source ?? c.name;

const isInternalCol = (name) => ["profile_id", "raw_run_id", "ingested_at"].includes(name);

const pgValue = (colType, v) => {
  if (v === undefined || v === null) return null;

  const t = String(colType).toLowerCase();

  // bigint: pgに安全に渡すため string に寄せる（JS number の桁落ち回避）
  if (t.startsWith("bigint")) return String(v);

  // numeric(x,y): 文字列 or number どちらでも良いが、ここも string に寄せると安全
  if (t.startsWith("numeric")) return String(v);

  // date: "YYYY-MM-DD" を想定（Amazon側も基本これ）
  if (t === "date") return String(v);

  // timestamptz: ISO文字列でOK
  if (t.includes("timestamptz")) return String(v);

  // text/varchar/etc
  return v;
};

const detectJsonMode = async (binPath) => {
  // 解凍後の先頭文字を見て、NDJSON（行JSON）か JSON配列かを推測
  // ここでは軽量に「先頭数KB」だけ読む
  const rs = fs.createReadStream(binPath);
  const gunzip = zlib.createGunzip();

  let buf = "";
  gunzip.setEncoding("utf8");

  gunzip.on("data", (chunk) => {
    if (buf.length < 4096) buf += chunk;
    if (buf.length >= 4096) {
      rs.destroy();
      gunzip.destroy();
    }
  });

  try {
    await pipeline(rs, gunzip);
  } catch {
    // destroyによる中断は無視
  }

  const first = buf.replace(/^\s+/, "")[0];
  if (first === "[") return "array";
  return "ndjson";
};
const RAW_ROOT = path.resolve(process.env.RAW_ROOT || "./data/raw");

const findRunIdInPath = (p) => {
  if (!p) return null;
  const parts = path.resolve(p).split(path.sep);
  const hit = parts.find((x) => x.startsWith("run-"));
  return hit || null;
};

const latestRunDir = () => {
  if (!fs.existsSync(RAW_ROOT)) return null;
  const dirs = fs.readdirSync(RAW_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("run-"))
    .map((d) => d.name);

  if (!dirs.length) return null;

  // run-YYYYMMDD... 形式なら文字列ソートでだいたい時系列になる前提
  dirs.sort();
  return dirs[dirs.length - 1];
};

const newestFile = (dir, ext = ".bin") => {
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      return { p, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files[0]?.p || null;
};

const main = async () => {
  const tableName = arg("table");
  let binPath = arg("bin");                 // optional
  let runId = arg("run-id");                // optional
  const profileId = arg("profile-id", process.env.AMZ_ADS_PROFILE_ID); // default env

  must(tableName, "--table is required (e.g. sp_campaign_daily)");
  must(profileId, "--profile-id is required (or set env AMZ_ADS_PROFILE_ID)");
  must(process.env.DATABASE_URL, "DATABASE_URL env is required");

  // 1) binPathがあるなら、run-idはパスから推定（指定がなければ）
  if (!runId) runId = findRunIdInPath(binPath);

  // 2) run-idがまだ無いなら、最新runを使う
  if (!runId) {
    runId = latestRunDir();
    must(runId, `No run-* dir found under RAW_ROOT=${RAW_ROOT}`);
  }

  // 3) binPathが無いなら、run配下の最新 .bin を使う
  if (!binPath) {
    const runDir = path.join(RAW_ROOT, runId);
    binPath = newestFile(runDir, ".bin");
    must(binPath, `No .bin file found in ${runDir}`);
  }

  // 以降は binPath / runId / profileId が確定している状態

  const specPath = path.resolve("ads-schema", "tables", `${tableName}.json`);
  const upsertPath = path.resolve("ads-schema", "generated", "sql", `upsert-${tableName.replaceAll("-", "_")}.sql`);

  // 例: tableNameは sp_campaign_daily のように指定
  // specPathは tables/sp_campaign_daily.json を期待する
  // もしファイル名がケバブケースなら、ここを適宜合わせてください
  const specExists = fs.existsSync(specPath);
  if (!specExists) {
    throw new Error(
      `Table spec not found: ${specPath}\n` +
        `Hint: ensure tables/${tableName}.json exists, or adjust specPath resolution.`
    );
  }
  must(fs.existsSync(upsertPath), `Upsert SQL not found: ${upsertPath}`);

  const spec = await readJson(specPath);
  const upsertSql = await fsp.readFile(upsertPath, "utf8");

  const cols = spec.columns.map(normalizeColumn);
  const colByName = new Map(cols.map((c) => [c.name, c]));

  // 必須内部列
  must(colByName.has("profile_id"), "spec requires profile_id column");
  must(colByName.has("raw_run_id"), "spec requires raw_run_id column");
  must(colByName.has("ingested_at"), "spec requires ingested_at column");

  const jsonMode = await detectJsonMode(binPath);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let inserted = 0;
  let processed = 0;
  let skipped = 0;

  const commitEvery = 2000;
  let inTx = false;

  const begin = async () => {
    if (!inTx) {
      await client.query("BEGIN");
      inTx = true;
    }
  };
  const commit = async () => {
    if (inTx) {
      await client.query("COMMIT");
      inTx = false;
    }
  };
  const rollback = async () => {
    if (inTx) {
      await client.query("ROLLBACK");
      inTx = false;
    }
  };

  const buildParams = (rowObj) => {
    const nowIso = new Date().toISOString();

    // spec.columns の順番どおりにパラメータ配列を作る
    return cols.map((c) => {
      if (c.name === "profile_id") return pgValue(c.type, profileId);
      if (c.name === "raw_run_id") return pgValue(c.type, runId);
      if (c.name === "ingested_at") return pgValue(c.type, nowIso);

      const src = apiColumnName(c);
      const v = rowObj?.[src];
      return pgValue(c.type, v);
    });
  };

  const upsertOne = async (rowObj) => {
    processed += 1;

    const params = buildParams(rowObj);

    // not null 列の最低限チェック（profile_id/raw_run_id/ingested_at 以外）
    // 欠損が多い場合でも取り込みを止めず、skipped として数える方針
    for (const c of cols) {
      if (c.null === false && !isInternalCol(c.name)) {
        const idx = cols.findIndex((x) => x.name === c.name);
        if (params[idx] === null) {
          skipped += 1;
          return;
        }
      }
    }

    await client.query(upsertSql, params);
    inserted += 1;

    if (inserted % commitEvery === 0) {
      await commit();
    }
  };

  try {
    await begin();

    const rs = fs.createReadStream(binPath);
    const gunzip = zlib.createGunzip();

    if (jsonMode === "ndjson") {
      const rl = readline.createInterface({ input: rs.pipe(gunzip), crlfDelay: Infinity });
      for await (const line of rl) {
        const s = line.trim();
        if (!s) continue;
        try {
          const obj = JSON.parse(s);
          await upsertOne(obj);
        } catch (e) {
          skipped += 1;
        }
      }
    } else {
      // JSON配列の場合：まず全部読む（巨大な場合は将来stream-json等に置換）
      const chunks = [];
      gunzip.on("data", (c) => chunks.push(c));
      await pipeline(rs, gunzip);
      const text = Buffer.concat(chunks).toString("utf8");
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("expected JSON array after gunzip");
      for (const obj of arr) {
        await upsertOne(obj);
      }
    }

    await commit();
  } catch (e) {
    await rollback();
    throw e;
  } finally {
    await client.end();
  }

  console.log(JSON.stringify({ ok: true, table: tableName, processed, inserted, skipped }, null, 2));
};

main().catch((e) => {
  console.error("ERROR:", e?.message || e);
  process.exit(1);
});
