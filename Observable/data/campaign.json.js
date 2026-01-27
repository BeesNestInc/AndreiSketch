// Node.jsで動作し、標準出力にJSONを出すだけ
import pg from "pg";

const client = new pg.Client("postgresql://ogochan:ogochan@10.2.254.11/amazon");
await client.connect();

// 3. SQL実行
const res1 = await client.query(`
SELECT distinct
    "campaign_id"
FROM "sp_campaign_daily"
LIMIT 1000;
`);

const campaigns = res1.rows;

const ids = [];
for ( const campaign of campaigns) {
  ids.push(campaign.campaign_id);
}
const res2 = await client.query(`
SELECT
    "date",
    "campaign_id",
    "impressions",
    "clicks",
    "cost"
FROM "sp_campaign_daily"
ORDER BY
    "campaign_id" ASC,
    "date" ASC
LIMIT 1000;
`);
const adsData = res2.rows;

for ( const ads of adsData ) {
  ads['id'] = ids.findIndex((id) => id === ads.campaign_id)
  ads.clicks = parseInt(ads.clicks);
  ads.impressions = parseInt(ads.impressions);
  ads.cost = parseFloat(ads.cost);
}

// 標準出力にJSONとして吐き出す
process.stdout.write(JSON.stringify(adsData));

await client.end();
