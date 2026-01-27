create table if not exists "sp_campaign_daily" (
  "profile_id" bigint not null,
  "date" date not null,
  "campaign_id" bigint not null,
  "impressions" bigint,
  "clicks" bigint,
  "cost" numeric(12,2),
  "raw_run_id" text not null,
  "ingested_at" timestamptz not null default now()
);
create table if not exists "sp_search_term_daily" (
  "profile_id" bigint not null,
  "date" date not null,
  "campaign_id" bigint not null,
  "ad_group_id" bigint not null default 0,
  "keyword_id" bigint not null default 0,
  "match_type" text not null default '',
  "search_term" text not null,
  "impressions" bigint,
  "clicks" bigint,
  "cost" numeric(12,2),
  "raw_run_id" text not null,
  "ingested_at" timestamptz not null default now()
);
