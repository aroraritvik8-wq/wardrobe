# Digital Wardrobe — setup guide

You've already got the code. To make it actually store clothes, you connect it
to a free **Supabase** account (the database + photo storage). This takes about
10 minutes and you only do it once.

---

## Step 1 — Make a free Supabase project

1. Go to **https://supabase.com** and click **Start your project** / **Sign in**
   (you can sign in with GitHub or email).
2. Click **New project**.
3. Give it a name (e.g. `wardrobe`), set a database password (save it
   somewhere), pick the nearest region, and click **Create new project**.
4. Wait ~2 minutes while it sets up.

## Step 2 — Create the tables and the photo bucket

1. In your project, click **SQL Editor** in the left menu.
2. Click **New query**.
3. Open the file **`supabase-setup.sql`** (in this `wardrobe` folder), copy
   everything in it, and paste it into the SQL editor.
4. Click **Run** (bottom right). You should see "Success".

That created the `items`, `outfits`, and `outfit_items` tables, plus a public
storage bucket called `wardrobe` for photos.

## Step 3 — Copy your two keys into the app

1. In Supabase, click the **gear / Settings** icon, then **API**.
2. You need two values from that page:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **service_role** key (under *Project API keys* — click *Reveal* to see it)
3. In the `wardrobe` folder, find the file **`.env.local.example`**.
4. Make a copy of it and rename the copy to exactly **`.env.local`**.
5. Open `.env.local` and paste your two values after the `=` signs:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... (your long secret key)
   ```

6. Save the file.

> 🔒 The `service_role` key is a secret. It stays in `.env.local`, which is
> never uploaded to GitHub. The app only uses it on the server, never in the
> browser.

## Step 4 — Run the app

In a terminal inside the `wardrobe` folder:

```powershell
npm run dev
```

Open **http://localhost:3000**. You can now:

- **+ Add item** — upload a photo and details; it saves to the database.
- See it appear in the grid (and it's still there after restarting — it's in
  the database now, not the code).
- Click an item to view details, **edit**, **delete**, or mark **Wore it today**.
- Use the **search / category / season** filters.
- Go to **Outfits** to combine items into a saved outfit.

---

## What's where (a quick map of the code)

```
src/
  app/
    page.tsx                  the wardrobe grid + filters (home page)
    add/page.tsx              the "add item" page
    items/[id]/page.tsx       one item's details
    items/[id]/edit/page.tsx  edit an item
    outfits/page.tsx          list of saved outfits
    outfits/new/page.tsx      build a new outfit
    layout.tsx                the top navigation bar (every page)
    api/                      the BACKEND (talks to Supabase)
      items/route.ts          list + add items
      items/[id]/route.ts     read + edit + delete one item
      items/[id]/wear/route.ts  "wore it today" counter
      upload/route.ts         save a photo to storage
      outfits/route.ts        list + create outfits
      outfits/[id]/route.ts   delete an outfit
  components/
    ItemCard.tsx              one card in the grid
    ItemForm.tsx              the add/edit form (shared)
  lib/
    supabase.ts               the database connection
    types.ts                  the shape of an Item / Outfit
    constants.ts              the category & season lists
```

The flow is always **page (frontend) → /api route (backend) → Supabase (database)**.

---

## Troubleshooting

- **"Supabase is not configured" error** → your `.env.local` is missing or the
  values are blank. Re-check Step 3, then stop the server (`Ctrl + C`) and run
  `npm run dev` again (env files are only read on startup).
- **Photos don't show** → make sure the `wardrobe` bucket is **Public**
  (Storage → wardrobe → settings). The SQL already sets this.
- **Changes to `.env.local` not taking effect** → always restart `npm run dev`
  after editing it.
