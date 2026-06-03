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


-- ============================================================
--  ACCOUNTS / LOGIN  (run this part after adding Google sign-in)
--  Gives every row an owner and locks the tables so each signed-in
--  user can only see and change THEIR OWN clothes, outfits, etc.
-- ============================================================

-- 1) Add an owner column to every table.
alter table items            add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table outfits          add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table outfit_items     add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table calendar_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2) Turn on Row Level Security (locks the tables by default).
alter table items            enable row level security;
alter table outfits          enable row level security;
alter table outfit_items     enable row level security;
alter table calendar_entries enable row level security;

-- 3) Allow each user to read/write only their own rows.
create policy "own items"     on items            for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own outfits"   on outfits          for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own links"     on outfit_items     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own calendar"  on calendar_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
