---
Title: Amazon Ads
---
```sql categories
SELECT
    "date",
    "campaign_id",
    "impressions",
    "clicks",
    "cost"
FROM "ads"."sp_campaign_daily"
ORDER BY
    "campaign_id" ASC,
    "date" ASC
LIMIT 1000;
```
<DataTable data={categories}>
	<Column id=campaign_id />
	<Column id=date />
</DataTable>