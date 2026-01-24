import 'dotenv/config';

const must = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

const clientId = must('AMZ_LWA_CLIENT_ID');
const redirectUri = must('AMZ_LWA_REDIRECT_URI');

// Ads API 用（SP運用の最低限）
const scope = process.env.AMZ_LWA_SCOPE || 'advertising::campaign_management';

// LWAの認可エンドポイント（一般的に amazon.com 側でOK。国別に変えるなら env で）
const authorizeBase = process.env.AMZ_LWA_AUTHORIZE_URL || 'https://www.amazon.com/ap/oa';

const url = new URL(authorizeBase);
url.searchParams.set('client_id', clientId);
url.searchParams.set('scope', scope);
url.searchParams.set('response_type', 'code');
url.searchParams.set('redirect_uri', redirectUri);

console.log(url.toString());
