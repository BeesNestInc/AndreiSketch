-- sp_search_term_daily
insert into "ads"."sp_search_term_daily" ("profile_id", "date", "campaign_id", "ad_group_id", "keyword_id", "match_type", "search_term", "impressions", "clicks", "cost", "raw_run_id", "ingested_at")
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
on conflict ("profile_id", "date", "campaign_id", "ad_group_id", "keyword_id", "match_type", "search_term") do update set
  "impressions" = excluded."impressions",
  "clicks" = excluded."clicks",
  "cost" = excluded."cost",
  "raw_run_id" = excluded."raw_run_id",
  "ingested_at" = now();
