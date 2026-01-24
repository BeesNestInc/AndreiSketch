import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {axios} from '../libs/utils.js';

const mustEnv = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env: ${k}`);
  return v;
};

const env = {
  // If set, can be comma-separated. Example:
  // AMZ_ADS_API_BASES=https://advertising-api-fe.amazon.com,https://advertising-api.amazon.com
  adsBases: (process.env.AMZ_ADS_API_BASES || process.env.AMZ_ADS_API_BASE || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  // IMPORTANT: LWA refresh token exchange endpoint (default should be api.amazon.com) :contentReference[oaicite:3]{index=3}
  lwaTokenUrl: process.env.AMZ_LWA_TOKEN_URL || 'https://api.amazon.com/auth/o2/token',

  clientId: mustEnv('AMZ_LWA_CLIENT_ID'),
  clientSecret: mustEnv('AMZ_LWA_CLIENT_SECRET'),
  refreshToken: mustEnv('AMZ_LWA_REFRESH_TOKEN'),

  // Optional selection hints (if multiple profiles)
  preferCountry: (process.env.AMZ_ADS_COUNTRY_CODE || 'JP').toUpperCase(),
  preferMarketplace: process.env.AMZ_ADS_MARKETPLACE_ID || '',
};

const DEFAULT_BASES = [
  'https://advertising-api-fe.amazon.com', // Far East (JP often)
  'https://advertising-api.amazon.com',    // NA
  'https://advertising-api-eu.amazon.com', // EU
];

const bases = env.adsBases.length ? env.adsBases : DEFAULT_BASES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isRetryableStatus = (s) => s === 429 || (s >= 500 && s <= 599);

const reqWithRetry = async (config, opt = {}) => {
  const maxAttempts = opt.maxAttempts ?? 6;
  const baseDelayMs = opt.baseDelayMs ?? 500;
  const maxDelayMs = opt.maxDelayMs ?? 10_000;

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await axios.request(config);
      if (!isRetryableStatus(res.status)) return res;

      const ra = res.headers?.['retry-after'];
      const serverDelay = ra ? Number(ra) * 1000 : NaN;
      const delay = Number.isFinite(serverDelay)
        ? serverDelay
        : Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);

      lastErr = new Error(`HTTP ${res.status} ${config.method || 'GET'} ${config.url}`);
      await sleep(delay);
    } catch (e) {
      lastErr = e;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      await sleep(delay);
    }
  }
  throw lastErr ?? new Error(`request failed: ${config.url}`);
};

const stringify = (x) => {
  try {
    if (typeof x === 'string') return x.slice(0, 5000);
    return JSON.stringify(x, null, 2).slice(0, 5000);
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

  const res = await reqWithRetry({
    method: 'POST',
    url: env.lwaTokenUrl,
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    data: form.toString(),
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`LWA token refresh failed: ${res.status}\n${stringify(res.data)}`);
  }
  if (!res.data?.access_token) {
    throw new Error(`LWA response missing access_token: ${JSON.stringify(res.data)}`);
  }
  return res.data.access_token;
};

const listProfilesOnce = async (base, accessToken) => {
  const url = `${base.replace(/\/$/, '')}/v2/profiles`;

  // For profiles endpoint, required headers include ClientId and Authorization (bearer ...) :contentReference[oaicite:4]{index=4}
  const res = await reqWithRetry({
    method: 'GET',
    url,
    headers: {
      'Amazon-Advertising-API-ClientId': env.clientId,
      'Authorization': `bearer ${accessToken}`, // NOTE: lowercase bearer :contentReference[oaicite:5]{index=5}
      'Accept': 'application/json',
    },
  });

  return res;
};

const pickProfile = (profiles) => {
  if (profiles.length === 0) return null;
  if (profiles.length === 1) return profiles[0];

  const byCountry = profiles.filter((p) => String(p.countryCode || '').toUpperCase() === env.preferCountry);
  if (byCountry.length === 1) return byCountry[0];

  if (env.preferMarketplace) {
    const byMkt = profiles.filter((p) => String(p.marketplaceStringId || '') === String(env.preferMarketplace));
    if (byMkt.length >= 1) return byMkt[0];
  }
  return null;
};

const atomicWrite = async (filePath, content) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp-${crypto.randomBytes(6).toString('hex')}`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
};

const updateDotenv = async (dotenvPath, key, value) => {
  let cur = '';
  try { cur = await fs.readFile(dotenvPath, 'utf8'); } catch { cur = ''; }

  const line = `${key}=${value}`;
  const re = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
  const next = re.test(cur)
    ? cur.replace(re, line)
    : (cur.endsWith('\n') || cur.length === 0 ? cur : cur + '\n') + line + '\n';

  await atomicWrite(dotenvPath, next);
};

async function main() {
  const args = new Set(process.argv.slice(2));
  const wantJson = args.has('--json');
  const wantWriteEnv = args.has('--write-env');
  const dotenvPath = process.env.DOTENV_PATH || '.env';

  const accessToken = await getAccessToken();

  // Try bases in order. Docs warn: call /v2/profiles in a region where the user manages accounts. :contentReference[oaicite:6]{index=6}
  let okBase = null;
  let profiles = null;
  let lastErr = null;

  for (const base of bases) {
    const res = await listProfilesOnce(base, accessToken);
    if (res.status >= 200 && res.status < 300 && Array.isArray(res.data)) {
      okBase = base;
      profiles = res.data;
      break;
    }
    lastErr = new Error(`Base ${base} -> ${res.status}\n${stringify(res.data)}`);
    // 401/403 は次のbaseを試す価値があるので継続
  }

  if (!profiles) {
    throw lastErr ?? new Error('Failed to retrieve profiles from all bases.');
  }

  const chosen = pickProfile(profiles);
  if (!chosen) {
    if (wantJson) {
      console.log(JSON.stringify({ ok: false, reason: 'ambiguous', adsBase: okBase, profiles }, null, 2));
    } else {
      console.log(`Connected OK. adsBase=${okBase}`);
      console.log('Multiple profiles found. Pick one and set AMZ_ADS_PROFILE_ID.');
      for (const p of profiles) {
        console.log(`- profileId=${p.profileId} countryCode=${p.countryCode} marketplaceStringId=${p.marketplaceStringId} type=${p.accountInfo?.type ?? ''}`);
      }
    }
    process.exit(2);
  }

  const profileId = String(chosen.profileId);

  if (wantWriteEnv) {
    await updateDotenv(dotenvPath, 'AMZ_ADS_PROFILE_ID', profileId);
    // also persist the working base so next steps don't guess
    await updateDotenv(dotenvPath, 'AMZ_ADS_API_BASE', okBase);
  }

  if (wantJson) {
    console.log(JSON.stringify({ ok: true, adsBase: okBase, profileId, chosen }, null, 2));
  } else {
    console.log(`AMZ_ADS_API_BASE=${okBase}`);
    console.log(`AMZ_ADS_PROFILE_ID=${profileId}`);
    if (wantWriteEnv) console.log(`(written to ${dotenvPath})`);
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
