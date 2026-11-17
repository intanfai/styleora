# Styleora — Your Personal Stylist

Styleora is a digital wardrobe web application that helps users organize their clothing collection, generate outfit combinations with AI, and save their favorite looks. Each user has a private account, and all data (clothing details, photos, and saved outfits) is stored in the cloud so it can be accessed from any device.

**Live demo:** https://styleorac.vercel.app/

## Features

- **Authentication** — Register and log in with email and password or Google OAuth, powered by Supabase Auth.
- **Dashboard** — View wardrobe statistics, saved outfits, a category summary, and live weather information.
- **My Wardrobe** — Add clothing with photo upload, search, filter by color and style, sort, and delete items.
- **AI Clothing Analysis** — Upload a photo and let Gemini suggest the item name, category, color, and style.
- **Outfit Generator** — Generate an outfit from your own wardrobe based on style, occasion, and the current weather.
- **Saved Outfits** — Save, search, filter, and remove your favorite outfits.
- **Account & Settings** — Update your display name and manage interface preferences.
- **Responsive Interface** — A minimalist design with a cream background and sage-green accents, optimized for desktop and mobile.

## Tech Stack

| Area                 | Technology                                         |
| -------------------- | -------------------------------------------------- |
| Framework            | Next.js (App Router), React, TypeScript            |
| Styling              | Tailwind CSS and custom CSS                        |
| Backend and database | Supabase (PostgreSQL)                              |
| Authentication       | Supabase Auth (email/password and Google OAuth)    |
| File storage         | Supabase Storage (private bucket with signed URLs) |
| AI                   | Google Gemini API                                  |
| Weather              | Open-Meteo API                                     |
| Icons                | lucide-react                                       |
| Deployment           | Vercel                                             |

## Architecture Highlights

- **Row Level Security (RLS)** is enabled on every table, so a user can only read and modify their own rows.
- **Private storage bucket.** Clothing photos are stored under `{user_id}/{file}.jpg` and displayed through short-lived signed URLs. Storage policies restrict access to each user's own folder.
- **Saved outfits store references, not photos.** Each outfit keeps only the IDs of its clothing items, so photos always stay valid and renamed items are reflected automatically.
- **Image compression** happens in the browser (Canvas) before upload, which keeps files small.
- **AI responses are validated** on the server, and unknown item IDs or invalid combinations (for example more than one top) are rejected.

## Getting Started

### Prerequisites

- Node.js
- npm
- Git
- A Supabase project
- A Google Gemini API key

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/intanfai/styleora.git
   cd styleora
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

   Keep API keys private. Never commit `.env.local` to a public repository.

4. Set up the database and storage (see below).

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

Run the following in the Supabase **SQL Editor**.

**Tables**

```sql
create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  category text not null,
  color text not null,
  style text,
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  style text not null,
  activity text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
```

**Row Level Security**

```sql
alter table public.wardrobe_items enable row level security;
alter table public.saved_outfits enable row level security;

create policy "select own items" on public.wardrobe_items
  for select using (auth.uid() = user_id);
create policy "insert own items" on public.wardrobe_items
  for insert with check (auth.uid() = user_id);
create policy "update own items" on public.wardrobe_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own items" on public.wardrobe_items
  for delete using (auth.uid() = user_id);

create policy "select own outfits" on public.saved_outfits
  for select using (auth.uid() = user_id);
create policy "insert own outfits" on public.saved_outfits
  for insert with check (auth.uid() = user_id);
create policy "update own outfits" on public.saved_outfits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own outfits" on public.saved_outfits
  for delete using (auth.uid() = user_id);
```

**Storage**

Create a **private** bucket named `wardrobe` (Storage → New bucket), then add these policies:

```sql
create policy "read own photos" on storage.objects
  for select using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "upload own photos" on storage.objects
  for insert with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects
  for delete using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = auth.uid()::text);
```

**Google OAuth**

Enable the Google provider in Supabase (Authentication → Providers). Under Authentication → URL Configuration, add your local URL (`http://localhost:3000`) and your Vercel URL to **Site URL** and **Redirect URLs**.

## Environment Variables

| Variable                               | Description                              |
| -------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (public) key        |
| `GEMINI_API_KEY`                       | Google Gemini API key (server-side only) |

Weather information is retrieved through Open-Meteo, which does not require an API key.

## Project Structure

```text
styleora/
├── app/
│   ├── api/
│   │   ├── analyze/            # AI clothing analysis
│   │   ├── generate-outfit/    # AI outfit generation
│   │   └── weather/            # Weather data
│   ├── account/
│   ├── context/                # Weather context
│   ├── outfits/
│   ├── saved-outfits/
│   ├── settings/
│   ├── wardrobe/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Dashboard
├── components/                 # Sidebar and shared components
├── lib/
│   ├── supabase/               # Supabase client setup
│   └── wardrobe.ts             # Wardrobe fetching with signed URLs
├── public/
├── package.json
└── README.md
```

## Testing

Styleora was tested manually, with a focus on data isolation and data persistence.

| Scenario                                   | Expected result                                           | Status |
| ------------------------------------------ | --------------------------------------------------------- | ------ |
| Add a clothing item, then refresh the page | The item and its photo are still displayed                | ✅     |
| Delete a clothing item                     | The row is removed from the database                      | ✅     |
| Log in with a second account               | Dashboard, wardrobe, and saved outfits are empty          | ✅     |
| Add data in account B                      | Account A does not see account B's data                   | ✅     |
| Save an outfit, then open Saved Outfits    | The outfit appears with photos and persists after refresh | ✅     |

## Known Limitations

- Outfit generation depends on the response time of the Gemini API, so it can take several seconds.
- Interface preferences in Settings are stored in the browser (`localStorage`) and are not synced across devices yet.
- The selected weather city is also remembered per browser.

## Future Improvements

- Reduce AI response time and add a clearer progress indicator.
- Sync interface preferences and the weather city across devices.
- Store the AI styling note together with each saved outfit.
- Add automated tests (unit and end-to-end) for the main user flows.
- Improve accessibility and add dark mode.

## Author

**Intan Nurul Faizia**

Fresh graduate in Informatics Engineering with experience as a Front End Developer intern and a growing interest in Quality Assurance. Focused on building user-friendly web applications and thoughtful UI/UX experiences.

## License

This project is developed as a personal portfolio project.
