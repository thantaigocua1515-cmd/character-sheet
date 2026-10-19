-- ============================================================
-- Character Sheet Studio — schema cho Supabase project MỚI
-- Chạy 1 lần trong Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) API keys theo tài khoản (mỗi user tự thêm key Gemini của mình)
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'gemini',
  label text not null default 'Key 1',
  api_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.user_api_keys enable row level security;
drop policy if exists "user_api_keys_owner" on public.user_api_keys;
create policy "user_api_keys_owner" on public.user_api_keys
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Nhân vật (mỗi user 2 slot)
create table if not exists public.cs_characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  name text not null default '',
  species text not null default '',
  role text not null default 'Main Character',
  personality text not null default '',
  traits text not null default '',
  age text not null default '',
  palette jsonb not null default '[]'::jsonb,
  art_style text not null default 'Pixar-like family animation style',
  hero_pose text not null default '',
  expressions text[] not null
    default array['Happy','Curious','Surprised','Mischievous','Angry','Confident'],
  actions text[] not null default array['','',''],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, slot)
);
alter table public.cs_characters enable row level security;
drop policy if exists "cs_characters_owner" on public.cs_characters;
create policy "cs_characters_owner" on public.cs_characters
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) Ảnh sheet đã tạo
create table if not exists public.cs_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid references public.cs_characters(id) on delete set null,
  character_name text not null default '',
  prompt text not null,
  storage_path text not null,
  model text not null default 'gemini-3.1-flash-image',
  created_at timestamptz not null default now()
);
alter table public.cs_sheets enable row level security;
drop policy if exists "cs_sheets_owner" on public.cs_sheets;
create policy "cs_sheets_owner" on public.cs_sheets
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index if not exists cs_sheets_user_created_idx
  on public.cs_sheets (user_id, created_at desc);

-- 4) Video (giai đoạn 2 — tạo sẵn bảng)
create table if not exists public.cs_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sheet_id uuid references public.cs_sheets(id) on delete set null,
  motion_prompt text not null default '',
  status text not null default 'queued',
  storage_path text,
  model text not null default '',
  error text,
  created_at timestamptz not null default now()
);
alter table public.cs_videos enable row level security;
drop policy if exists "cs_videos_owner" on public.cs_videos;
create policy "cs_videos_owner" on public.cs_videos
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5) Storage buckets (private — mỗi user chỉ thấy folder của mình)
insert into storage.buckets (id, name, public)
values ('cs-sheets', 'cs-sheets', false),
       ('cs-videos', 'cs-videos', false)
on conflict (id) do nothing;

-- 6) Storage policies: file nằm trong folder <user_id>/...
drop policy if exists "cs_storage_read_own" on storage.objects;
create policy "cs_storage_read_own" on storage.objects for select
  using (bucket_id in ('cs-sheets', 'cs-videos')
         and auth.uid()::text = split_part(name, '/', 1));

drop policy if exists "cs_storage_insert_own" on storage.objects;
create policy "cs_storage_insert_own" on storage.objects for insert
  with check (bucket_id in ('cs-sheets', 'cs-videos')
              and auth.uid()::text = split_part(name, '/', 1));

drop policy if exists "cs_storage_update_own" on storage.objects;
create policy "cs_storage_update_own" on storage.objects for update
  using (bucket_id in ('cs-sheets', 'cs-videos')
         and auth.uid()::text = split_part(name, '/', 1));

drop policy if exists "cs_storage_delete_own" on storage.objects;
create policy "cs_storage_delete_own" on storage.objects for delete
  using (bucket_id in ('cs-sheets', 'cs-videos')
         and auth.uid()::text = split_part(name, '/', 1));
