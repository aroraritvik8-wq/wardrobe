-- ============================================================
--  Digital Wardrobe — database setup
--  Run this ONCE in your Supabase project:
--    Supabase dashboard -> SQL Editor -> New query -> paste -> Run
--  It creates the three tables and the photo storage bucket.
-- ============================================================

-- 1) The clothing items.
create table if not exists items (
  id          bigint generated always as identity primary key,
  name        text not null,
  category    text not null,
  colour      text default '',
  season      text default 'all',
  image_url   text,
  times_worn  bigint default 0,
  created_at  timestamptz default now()
);

-- 2) The saved outfits.
create table if not exists outfits (
  id          bigint generated always as identity primary key,
  name        text not null,
  created_at  timestamptz default now()
);

-- 3) The join table linking outfits <-> items (a many-to-many relationship).
--    "on delete cascade" means: if an outfit or item is deleted, the link
--    rows pointing at it are cleaned up automatically.
create table if not exists outfit_items (
  outfit_id  bigint references outfits (id) on delete cascade,
  item_id    bigint references items (id) on delete cascade,
  primary key (outfit_id, item_id)
);

-- 4) A public storage bucket to hold the uploaded photos.
--    (You can also create this in the dashboard: Storage -> New bucket ->
--     name it "wardrobe" and tick "Public bucket".)
insert into storage.buckets (id, name, public)
values ('wardrobe', 'wardrobe', true)
on conflict (id) do nothing;
