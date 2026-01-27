import fs from "node:fs";
import path from "node:path";

const TABLES_DIR = path.resolve("ads-schema/tables");
const VIEWS_DIR = path.resolve("ads-schema/views"); // まだ無くてもOK
const OUT_DIR = path.resolve("ads-schema/generated");

const q = (ident) => `"${String(ident).replaceAll('"', '""')}"`;

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const listFiles = (dir, ext) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f))
    .sort();
};

const normalizeColumn = (c) => ({
  name: c.name,
  type: c.type,
  null: c.null ?? true,
  default: c.default,
  source: c.source, // may be undefined
});

const apiColumnName = (c) => c.source ?? c.name;

const internalCols = new Set(["profile_id", "raw_run_id", "ingested_at"]);

const validateSpec = (t) => {
  const must = (cond, msg) => {
    if (!cond) throw new Error(`[${t.name}] ${msg}`);
  };
  must(typeof t.name === "string" && t.name.length > 0, "name is required");
  must(t.report && typeof t.report === "object", "report is required");
  must(typeof t.report.reportTypeId === "string", "report.reportTypeId is required");
  must(typeof t.report.timeUnit === "string", "report.timeUnit is required");
  must(Array.isArray(t.columns) && t.columns.length > 0, "columns is required");
  must(Array.isArray(t.unique) && t.unique.length > 0, "unique is required (for upsert)");

  const cols = t.columns.map(normalizeColumn);
  const colNames = new Set(cols.map((c) => c.name));
  must(colNames.has("profile_id"), "profile_id column is required");
  must(colNames.has("raw_run_id"), "raw_run_id column is required");
  must(colNames.has("ingested_at"), "ingested_at column is required");

  if (t.report.timeUnit === "DAILY") {
    const hasDate = cols.some((c) => apiColumnName(c) === "date");
    must(hasDate, "timeUnit=DAILY requires a date column (source/name: date)");
  }

  // unique columns exist
  for (const keyCols of t.unique) {
    for (const k of keyCols) must(colNames.has(k), `unique key column missing: ${k}`);
  }
};

const ddlForTable = (t) => {
  const cols = t.columns.map(normalizeColumn);
  const lines = [];

  lines.push(`create table if not exists ${q(t.name)} (`);

  const colDefs = cols.map((c) => {
    const parts = [];
    parts.push(`  ${q(c.name)} ${c.type}`);
    if (c.null === false) parts.push("not null");
    if (c.default) parts.push(`default ${c.default}`);
    return parts.join(" ");
  });

  lines.push(colDefs.join(",\n"));
  lines.push(");");
  lines.push("");

  return lines.join("\n");
};

const indexSqlForTable = (t) => {
  const lines = [];

  // unique -> unique indexes
  (t.unique ?? []).forEach((cols, i) => {
    const idxName = `${t.name}__uq_${i}`;
    const colsSql = cols.map(q).join(", ");
    lines.push(
      `create unique index if not exists ${q(idxName)} on ${q(t.name)} (${colsSql});`
    );
  });

  // normal indexes
  (t.indexes ?? []).forEach((cols, i) => {
    const idxName = `${t.name}__ix_${i}`;
    const colsSql = cols.map(q).join(", ");
    lines.push(
      `create index if not exists ${q(idxName)} on ${q(t.name)} (${colsSql});`
    );
  });

  lines.push("");
  return lines.join("\n");
};

const upsertSqlForTable = (t) => {
  const cols = t.columns.map(normalizeColumn).map((c) => c.name);

  const conflictCols = t.unique?.[0];
  if (!conflictCols?.length) throw new Error(`[${t.name}] unique[0] is required for upsert`);

  const insertCols = cols.map(q).join(", ");
  const values = cols.map((_, i) => `$${i + 1}`).join(", ");
  const conflict = conflictCols.map(q).join(", ");

  // 更新対象：ユニークキー以外。ただし ingested_at は常に now() に更新
  const updateCols = cols
    .filter((c) => !conflictCols.includes(c))
    .filter((c) => c !== "ingested_at")
    .map((c) => `${q(c)} = excluded.${q(c)}`);

  return [
    `-- ${t.name}`,
    `insert into ${q(t.name)} (${insertCols})`,
    `values (${values})`,
    `on conflict (${conflict}) do update set`,
    `  ${updateCols.join(",\n  ")},`,
    `  ${q("ingested_at")} = now();`,
    "",
  ].join("\n");
};

const reportRequestForTable = (t) => {
  const cols = t.columns
    .map(normalizeColumn)
    .map(apiColumnName)
    .filter((x) => !internalCols.has(x)); // internal列は除外

  return {
    adProduct: t.report.adProduct,
    reportTypeId: t.report.reportTypeId,
    timeUnit: t.report.timeUnit,
    groupBy: t.report.groupBy,
    columns: cols,
  };
};

const concatViewsSql = () => {
  const files = listFiles(VIEWS_DIR, ".sql");
  if (!files.length) return "";
  const chunks = files.map((p) => `-- ${path.basename(p)}\n${fs.readFileSync(p, "utf8").trim()}\n`);
  return chunks.join("\n");
};

// ---- main ----
ensureDir(OUT_DIR);
ensureDir(path.join(OUT_DIR, "sql"));
ensureDir(path.join(OUT_DIR, "reports"));

const tableFiles = listFiles(TABLES_DIR, ".json");
if (!tableFiles.length) {
  console.error("no table specs found in:", TABLES_DIR);
  process.exit(1);
}

const specs = tableFiles.map((p) => {
  const t = readJson(p);
  validateSpec(t);
  return t;
});

// SQL outputs
let tablesSql = "";
let indexesSql = "";
for (const t of specs) {
  tablesSql += ddlForTable(t);
  indexesSql += indexSqlForTable(t);
}
fs.writeFileSync(path.join(OUT_DIR, "sql", "10-tables.sql"), tablesSql);
fs.writeFileSync(path.join(OUT_DIR, "sql", "20-indexes.sql"), indexesSql);

const viewsSql = concatViewsSql();
if (viewsSql) fs.writeFileSync(path.join(OUT_DIR, "sql", "30-views.sql"), viewsSql);

// per-table outputs
for (const t of specs) {
  fs.writeFileSync(path.join(OUT_DIR, "sql", `upsert-${t.name}.sql`), upsertSqlForTable(t));
  fs.writeFileSync(
    path.join(OUT_DIR, "reports", `${t.name}.request.json`),
    JSON.stringify(reportRequestForTable(t), null, 2)
  );
}

console.log("generated:");
console.log("  sql   ->", path.join(OUT_DIR, "sql"));
console.log("  reports->", path.join(OUT_DIR, "reports"));
console.log("tables:", specs.map((t) => t.name).join(", "));
