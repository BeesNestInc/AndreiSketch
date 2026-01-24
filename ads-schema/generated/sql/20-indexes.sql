create unique index if not exists "sp_campaign_daily__uq_0" on "ads"."sp_campaign_daily" ("profile_id", "date", "campaign_id");
create index if not exists "sp_campaign_daily__ix_0" on "ads"."sp_campaign_daily" ("profile_id", "date");
create index if not exists "sp_campaign_daily__ix_1" on "ads"."sp_campaign_daily" ("campaign_id");
create unique index if not exists "sp_search_term_daily__uq_0" on "ads"."sp_search_term_daily" ("profile_id", "date", "campaign_id", "ad_group_id", "keyword_id", "match_type", "search_term");
create index if not exists "sp_search_term_daily__ix_0" on "ads"."sp_search_term_daily" ("profile_id", "date");
create index if not exists "sp_search_term_daily__ix_1" on "ads"."sp_search_term_daily" ("campaign_id");
create index if not exists "sp_search_term_daily__ix_2" on "ads"."sp_search_term_daily" ("search_term");
