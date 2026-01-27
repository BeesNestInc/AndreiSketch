import 'dotenv/config';
import axios from 'axios';

const mustEnv = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env: ${k}`);
  return v;
};

const env = {
  lwaTokenUrl: process.env.AMZ_LWA_TOKEN_URL || 'https://api.amazon.com/auth/o2/token',
  clientId: mustEnv('AMZ_LWA_CLIENT_ID'),
  clientSecret: mustEnv('AMZ_LWA_CLIENT_SECRET'),
  refreshToken: mustEnv('AMZ_LWA_REFRESH_TOKEN'),
  adsBases: (process.env.AMZ_ADS_API_BASES || process.env.AMZ_ADS_API_BASE || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
};

const DEFAULT_BASES = [
  'https://advertising-api-fe.amazon.com',
  'https://advertising-api.amazon.com',
  'https://advertising-api-eu.amazon.com',
];

const bases = env.adsBases.length ? env.adsBases : DEFAULT_BASES;

const ax = axios.create({
  timeout: Number(process.env.HTTP_TIMEOUT_MS || '30000'),
  validateStatus: () => true,
  maxRedirects: 5,
});

const getAccessToken = async () => {
  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('refresh_token', env.refreshToken);
  form.set('client_id', env.clientId);
  form.set('client_secret', env.clientSecret);

  const res = await ax.request({
    method: 'POST',
    url: env.lwaTokenUrl,
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    data: form.toString(),
  });

  return res;
};

const main = async () => {
  console.log(`LWA token endpoint: ${env.lwaTokenUrl}`);

  // 1) Token refresh
  const tokRes = await getAccessToken();
  console.log(`Token refresh status: ${tokRes.status}`);
  if (tokRes.status < 200 || tokRes.status >= 300) {
    console.log(tokRes.data);
    process.exit(1);
  }
  const token = tokRes.data?.access_token;
  if (!token) {
    console.log('No access_token in response:', tokRes.data);
    process.exit(1);
  }

  // LWA access tokens are long and often start with Atza| (common property) :contentReference[oaicite:3]{index=3}
  console.log(`access_token prefix: ${String(token).slice(0, 5)}...  length=${String(token).length}`);

  // 2) Sanity check token against LWA user profile endpoint
  // This endpoint is documented for validating that the token is usable to call Amazon user profile APIs. :contentReference[oaicite:4]{index=4}
  const profileRes = await ax.request({
    method: 'GET',
    url: 'https://api.amazon.com/user/profile',
    headers: { Authorization: `bearer ${token}` },
  });
  console.log(`LWA /user/profile status: ${profileRes.status}`);
  if (profileRes.status >= 200 && profileRes.status < 300) {
    console.log(`LWA user_id: ${profileRes.data?.user_id ?? '(no user_id)'}`);
  } else {
    console.log(profileRes.data);
  }

  // 3) Try Ads /v2/profiles on each base
  for (const base of bases) {
    const res = await ax.request({
      method: 'GET',
      url: `${base.replace(/\/$/, '')}/v2/profiles`,
      headers: {
        'Amazon-Advertising-API-ClientId': env.clientId,
        Authorization: `bearer ${token}`,
        Accept: 'application/json',
      },
    });
    console.log(`Ads base ${base} -> ${res.status}`);
    if (res.status >= 200 && res.status < 300) {
      console.log(`profiles count = ${Array.isArray(res.data) ? res.data.length : '(not array)'}`);
      if (Array.isArray(res.data) && res.data[0]) {
        console.log(`example profileId=${res.data[0].profileId} countryCode=${res.data[0].countryCode}`);
      }
    } else {
      console.log(res.data);
    }
  }
};

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
