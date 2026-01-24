// ads-schema/validate-table-spec.js
import fs from "node:fs";

const specPath = process.argv[2];
if (!specPath) {
  console.error("usage: node validate-table-spec.js <table-spec.json>");
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

must(typeof spec.name === "string" && spec.name.length > 0, "name is required");
must(spec.report && typeof spec.report === "object", "report is required");
must(typeof spec.report.reportTypeId === "string", "report.reportTypeId is required");
must(typeof spec.report.timeUnit === "string", "report.timeUnit is required");
must(Array.isArray(spec.columns) && spec.columns.length > 0, "columns is required");
must(Array.isArray(spec.unique) && spec.unique.length > 0, "unique is required (for upsert)");

const colByName = new Map(spec.columns.map(c => [c.name, c]));
must(colByName.has("profile_id"), "profile_id column is required");
must(colByName.has("raw_run_id"), "raw_run_id column is required");
must(colByName.has("ingested_at"), "ingested_at column is required");

if (spec.report.timeUnit === "DAILY") {
  // timeUnit=DAILY なら date が必要
  const hasDate = spec.columns.some(c => (c.source ?? c.name) === "date");
  must(hasDate, "timeUnit=DAILY requires date column (source/name: date)");
}

console.log("OK:", spec.name);
console.log("report:", spec.report);
console.log(
  "api columns:",
  spec.columns
    .map(c => c.source ?? c.name)
    .filter(x => !["profile_id", "raw_run_id", "ingested_at"].includes(x))
);
