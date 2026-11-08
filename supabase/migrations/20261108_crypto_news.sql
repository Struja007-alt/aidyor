-- AIDYOR Crypto News Feed: publishers, items, paid placements
-- Pricing rules enforced by the database:
--   slot 1       = $500 (top)
--   slots 2-3    = $300 (top 3)
--   slots 4-5    = $200 (top 5)
-- One active placement per slot at any time (no overlapping dates).

create extension if not exists btree_gist;

create table public.news_publishers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  site_url    text not null,
  logo_url    text,
  rss_url     text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.news_items (
  id            text primary key,              -- sha-256 of url (first 32 hex chars)
  publisher_id  uuid not null references public.news_publishers(id) on delete cascade,
  title         text not null,
  excerpt       text,
  url           text not null unique,
  image_url     text,
  published_at  timestamptz not null,
  created_at    timestamptz not null default now()
);

create index news_items_published_idx on public.news_items (published_at desc);
create index news_items_publisher_idx on public.news_items (publisher_id, published_at desc);

create table public.news_placements (
  id            uuid primary key default gen_random_uuid(),
  publisher_id  uuid not null references public.news_publishers(id) on delete cascade,
  slot          smallint not null check (slot between 1 and 5),
  price_usd     integer not null,
  tier          text generated always as (
                  case when slot = 1 then 'top'
                       when slot in (2, 3) then 'top3'
                       else 'top5' end
                ) stored,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint news_placements_dates_ok check (ends_at > starts_at),
  constraint news_placements_price_matches_slot check (
    (slot = 1 and price_usd = 500) or
    (slot in (2, 3) and price_usd = 300) or
    (slot in (4, 5) and price_usd = 200)
  ),
  constraint news_placements_no_overlap exclude using gist (
    slot with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (active)
);

create index news_placements_active_idx on public.news_placements (active, starts_at, ends_at);

-- Lock everything down. Only edge functions (service role) touch these tables.
alter table public.news_publishers enable row level security;
alter table public.news_items      enable row level security;
alter table public.news_placements enable row level security;

revoke all on public.news_publishers from anon, authenticated;
revoke all on public.news_items      from anon, authenticated;
revoke all on public.news_placements from anon, authenticated;

-- ---------------------------------------------------------------
-- Example: add a publisher and sell them slot 1 for 30 days
-- (run manually, adjust values)
-- ---------------------------------------------------------------
-- insert into public.news_publishers (name, site_url, logo_url, rss_url)
-- values ('Example Security Blog', 'https://example.com', 'https://example.com/logo.png', 'https://example.com/feed.xml');
--
-- insert into public.news_placements (publisher_id, slot, price_usd, starts_at, ends_at)
-- select id, 1, 500, now(), now() + interval '30 days'
-- from public.news_publishers where name = 'Example Security Blog';
