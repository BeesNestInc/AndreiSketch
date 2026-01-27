import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import {sha256Hex, writeFileAtomic, axios} from '../libs/utils.js';

const mustEnv = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env: ${k}`);
  return v;
};

const mustFileJson = async (p) => {
  const raw = await fs.readFile(p, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON file: ${p}\n${e?.message || e}`);
  }
};

const resolveRequestPath = () => {
  return (
    process.argv[2] ||
    process.env.REPORT_REQUEST_JSON
  );
};

const validateRequest = (req) => {
  const must = (cond, msg) => {
    if (!cond) throw new Error(`Bad request.json: ${msg}`);
  };
  must(req && typeof req === 'object', 'root must be object');
  must(typeof req.reportTypeId === 'string' && req.reportTypeId, 'reportTypeId is required');
  must(typeof req.timeUnit === 'string' && req.timeUnit, 'timeUnit is required');
  must(Array.isArray(req.columns) && req.columns.length > 0, 'columns[] is required');
  if (req.timeUnit === 'DAILY') {
    must(req.columns.includes('date'), 'timeUnit=DAILY requires columns to include "date"');
  }
};

const env = {
  adsBase: process.env.AMZ_ADS_API_BASE || 'https://advertising-api-fe.amazon.com',
  lwaTokenUrl: process.env.AMZ_LWA_TOKEN_URL || 'https://api.amazon.co.jp/auth/o2/token',
  clientId: mustEnv('AMZ_LWA_CLIENT_ID'),
  clientSecret: mustEnv('AMZ_LWA_CLIENT_SECRET'),
  refreshToken: mustEnv('AMZ_LWA_REFRESH_TOKEN'),
  profileId: mustEnv('AMZ_ADS_PROFILE_ID'),
  dataDir: process.env.ADS_DATA_DIR || './data',
  format: process.env.FORMAT || 'GZIP_JSON',

  reportDays: Number(process.env.REPORT_DAYS || '30'),

  pollMaxSeconds: Number(process.env.POLL_MAX_SECONDS || '900'),
  pollInitialDelayMs: Number(process.env.POLL_INITIAL_DELAY_MS || '3000'),
  pollMaxDelayMs: Number(process.env.POLL_MAX_DELAY_MS || '30000'),
  httpTimeoutMs: Number(process.env.HTTP_TIMEOUT_MS || '30000')
};

const utcDateOnly = (d) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const runIdUtc = () => {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
};

const computeDateRange = () => {
  // last REPORT_DAYS ending yesterday (UTC)
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (env.reportDays - 1));
  return { startDate: utcDateOnly(start), endDate: utcDateOnly(end) };
};

const isRetryableStatus = (status) => status === 429 || (status >= 500 && status <= 599);

const requestWithRetry = async (config, opt = {}) => {
  const {
    maxAttempts = 6,
    baseDelayMs = 500,
    maxDelayMs = 10_000
  } = opt;

  let attempt = 0;
  let lastErr;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const res = await axios.request(config);

      if (!isRetryableStatus(res.status)) return res;

      const ra = res.headers?.['retry-after'];
      const serverDelay = ra ? Number(ra) * 1000 : NaN;
      const delay = Number.isFinite(serverDelay)
        ? serverDelay
        : Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);

      lastErr = new Error(`HTTP ${res.status} (attempt ${attempt}/${maxAttempts}) ${config.method || 'GET'} ${config.url}\n${stringifyBody(res.data)}`);
      await sleep(delay);
    } catch (e) {
      lastErr = e;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      await sleep(delay);
    }
  }

  throw lastErr ?? new Error(`requestWithRetry failed: ${config.url}`);
};

const stringifyBody = (data) => {
  try {
    if (typeof data === 'string') return data.slice(0, 3000);
    if (Buffer.isBuffer(data)) return `<buffer ${data.length}>`;
    return JSON.stringify(data).slice(0, 3000);
  } catch {
    return '';
  }
};

const getAccessToken = async () => {
  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('refresh_token', env.refreshToken);
  form.set('client_id', env.clientId);
  form.set('client_secret', env.clientSecret);

  const res = await requestWithRetry({
    method: 'POST',
    url: env.lwaTokenUrl,
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    data: form.toString()
  }, { maxAttempts: 6 });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`LWA token refresh failed: ${res.status}\n${stringifyBody(res.data)}`);
  }
  const json = res.data;
  if (!json?.access_token) throw new Error(`LWA response missing access_token: ${JSON.stringify(json)}`);
  return json.access_token;
};

const postJson = async (url, body, headers) => {
  const res = await requestWithRetry({
    method: 'POST',
    url,
    headers: { 'content-type': 'application/json', ...headers },
    data: body
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`POST ${url} failed: ${res.status}\n${stringifyBody(res.data)}`);
  }
  return res.data;
};

const getJson = async (url, headers) => {
  const res = await requestWithRetry({
    method: 'GET',
    url,
    headers
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`GET ${url} failed: ${res.status}\n${stringifyBody(res.data)}`);
  }
  return res.data;
};

const downloadBinary = async (url) => {
  const res = await requestWithRetry({
    method: 'GET',
    url,
    responseType: 'arraybuffer',
    // download URLs are usually pre-signed; no auth header
    headers: { 'accept': '*/*' }
  }, { maxAttempts: 8, maxDelayMs: 20_000 });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Download failed: ${res.status}\n${stringifyBody(res.data)}`);
  }
  return Buffer.from(res.data);
};

const main = async () => {
  const requestPath = resolveRequestPath();
  const requestJson = await mustFileJson(requestPath);
  validateRequest(requestJson);
  const runId = runIdUtc();
  const { startDate, endDate } = computeDateRange();

  const accessToken = await getAccessToken();

  const commonHeaders = {
    'Amazon-Advertising-API-ClientId': env.clientId,
    'Amazon-Advertising-API-Scope': env.profileId,
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json'
  };

  const reportName = `SP campaign report ${startDate}..${endDate}`;
  const createBody = {
    name: reportName,
    startDate,
    endDate,
    configuration: {
      adProduct: requestJson.adProduct || 'SPONSORED_PRODUCTS',
      reportTypeId: requestJson.reportTypeId,
      timeUnit: requestJson.timeUnit,
      format: 'GZIP_JSON',
      groupBy: requestJson.groupBy,     // 無ければ undefined でOK
      columns: requestJson.columns
    }
  };

  const createUrl = `${env.adsBase.replace(/\/$/, '')}/reporting/reports`;
  const createRes = await postJson(
    createUrl,
    createBody,
    {
      ...commonHeaders,
      // v3 create uses vendor content type
      'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
    }
  );

  const reportId = createRes?.reportId;
  if (!reportId) throw new Error(`Create report response missing reportId: ${JSON.stringify(createRes)}`);

  const runDir = path.join(env.dataDir, 'raw', `run-${runId}`);
  await fs.mkdir(runDir, { recursive: true });

  // reproducibility helpers (消したければこの2つのwriteFileAtomicを削除でOK)
  const reqPath = path.join(runDir, `sp-campaign_${startDate}_${endDate}_req.json`);
  await writeFileAtomic(reqPath, Buffer.from(JSON.stringify(createBody, null, 2)));
  const specCopyPath = path.join(runDir, `request-spec.json`);
  await writeFileAtomic(specCopyPath, Buffer.from(JSON.stringify(requestJson, null, 2)));

  const statusUrl = `${createUrl}/${encodeURIComponent(String(reportId))}`;
  const deadline = Date.now() + env.pollMaxSeconds * 1000;
  let delay = env.pollInitialDelayMs;

  let statusJson;
  while (true) {
    statusJson = await getJson(statusUrl, commonHeaders);
    const status = String(statusJson?.status || '').toUpperCase();

    if (status === 'COMPLETED') break;
    if (status === 'FAILURE' || status === 'FAILED') {
      throw new Error(`Report failed: ${JSON.stringify(statusJson)}`);
    }
    if (Date.now() > deadline) {
      throw new Error(`Report polling timed out after ${env.pollMaxSeconds}s. Last status: ${JSON.stringify(statusJson)}`);
    }
    await sleep(delay);
    delay = Math.min(env.pollMaxDelayMs, Math.floor(delay * 1.5) + Math.floor(Math.random() * 250));
  }

  const downloadUrl =
    statusJson?.url ||
    statusJson?.location ||
    statusJson?.downloadUrl;

  if (!downloadUrl) throw new Error(`COMPLETED but missing download URL in status: ${JSON.stringify(statusJson)}`);

  const buf = await downloadBinary(downloadUrl);
  const sha = sha256Hex(buf);

  const outBase = `sp-campaign_${startDate}_${endDate}_cols1_${requestJson.reportTypeId}_${requestJson.timeUnit}_${(requestJson.format || env.format)}`;
  const outPath = path.join(runDir, `${outBase}.bin`);
  await writeFileAtomic(outPath, buf);

  const info = {
    runId,
    startDate,
    endDate,
    reportId,
    adsBase: env.adsBase,
    reportTypeId: requestJson.reportTypeId,
    timeUnit: requestJson.timeUnit,
    format: requestJson.format || env.format,
    groupBy: requestJson.groupBy,
    columns: requestJson.columns,
    requestPath,
    bytes: buf.length,
    sha256: sha,
    savedAs: outPath,
    savedRequestAs: reqPath
  };
  const infoPath = path.join(runDir, `${outBase}.info.json`);
  await writeFileAtomic(infoPath, Buffer.from(JSON.stringify(info, null, 2)));

  console.log(JSON.stringify(info, null, 2));
};

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
