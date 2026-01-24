-- sp_campaign_daily
insert into "ads"."sp_campaign_daily" ("profile_id", "date", "campaign_id", "impressions", "clicks", "cost", "raw_run_id", "ingested_at")
values ($1, $2, $3, $4, $5, $6, $7, $8)
on conflict ("profile_id", "date", "campaign_id") do update set
  "impressions" = excluded."impressions",
  "clicks" = excluded."clicks",
  "cost" = excluded."cost",
  "raw_run_id" = excluded."raw_run_id",
  "ingested_at" = now();
