-- LOOKU initial schema. Apply only to a dedicated Supabase project.
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  style_preferences jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

create table if not exists public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  brand text,
  category text not null check (category in ('Tops','Bottoms','Shoes','Outerwear','Dresses','Accessories','Activewear','Sleepwear','Bags','Other')),
  colors text[] not null default '{}'::text[],
  pattern text,
  formality smallint not null default 5 check (formality between 1 and 10),
  seasons text[] not null default '{}'::text[],
  style_tags text[] not null default '{}'::text[],
  image_path text,
  status text not null default 'available' check (status in ('available','laundry','retired')),
  is_owned boolean not null default true,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wardrobe_items_user_category_idx on public.wardrobe_items(user_id, category);
create index if not exists wardrobe_items_user_status_idx on public.wardrobe_items(user_id, status);
create trigger wardrobe_items_set_updated_at before update on public.wardrobe_items for each row execute procedure public.set_updated_at();

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My look' check (char_length(title) <= 120),
  occasion text not null default 'Everyday',
  style_label text,
  recommendation_reason text,
  status text not null default 'saved' check (status in ('suggested','saved','planned','worn')),
  source text not null default 'manual' check (source in ('ai','manual')),
  cover_image_path text,
  worn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outfits_user_created_idx on public.outfits(user_id, created_at desc);
create trigger outfits_set_updated_at before update on public.outfits for each row execute procedure public.set_updated_at();

create table if not exists public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique(outfit_id, wardrobe_item_id)
);
create index if not exists outfit_items_outfit_idx on public.outfit_items(outfit_id, position);

create table if not exists public.outfit_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  event_title text not null default 'Outfit plan' check (char_length(event_title) <= 140),
  occasion text not null default 'Everyday',
  notes text,
  outfit_id uuid references public.outfits(id) on delete set null,
  external_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outfit_plans_user_date_idx on public.outfit_plans(user_id, plan_date);
create trigger outfit_plans_set_updated_at before update on public.outfit_plans for each row execute procedure public.set_updated_at();

create table if not exists public.outfit_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike','wore','swap','save')),
  reasons text[] not null default '{}'::text[],
  note text,
  created_at timestamptz not null default now()
);
create index if not exists outfit_feedback_user_idx on public.outfit_feedback(user_id, created_at desc);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  product_url text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists wishlist_items_user_idx on public.wishlist_items(user_id, created_at desc);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'Other',
  brand text,
  merchant text not null,
  currency text not null default 'KES',
  price numeric(12,2),
  image_url text,
  product_url text not null,
  affiliate_url text,
  country_code text[] not null default ARRAY['KE']::text[],
  sizes text[] not null default '{}'::text[],
  is_active boolean not null default false,
  is_approved boolean not null default false,
  source text not null default 'merchant',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists products_active_category_idx on public.products(is_active, is_approved, category);

create table if not exists public.merchant_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_name text not null,
  contact_email text not null,
  website text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  call_count integer not null default 0 check (call_count >= 0),
  primary key (user_id, usage_date)
);

drop function if exists public.consume_ai_quota(integer);
create or replace function public.consume_ai_quota()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid; v_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then return false; end if;
  insert into public.ai_usage_daily (user_id, usage_date, call_count)
  values (v_user_id, (timezone('utc', now()))::date, 1)
  on conflict (user_id, usage_date)
  do update set call_count = public.ai_usage_daily.call_count + 1
  where public.ai_usage_daily.call_count < 20
  returning call_count into v_count;
  return v_count is not null;
end;
$$;
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;

alter table public.profiles enable row level security;
alter table public.wardrobe_items enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;
alter table public.outfit_plans enable row level security;
alter table public.outfit_feedback enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.products enable row level security;
alter table public.merchant_applications enable row level security;
alter table public.ai_usage_daily enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "wardrobe_select_own" on public.wardrobe_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "wardrobe_insert_own" on public.wardrobe_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "wardrobe_update_own" on public.wardrobe_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "wardrobe_delete_own" on public.wardrobe_items for delete to authenticated using ((select auth.uid()) = user_id);
create policy "outfits_select_own" on public.outfits for select to authenticated using ((select auth.uid()) = user_id);
create policy "outfits_insert_own" on public.outfits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "outfits_update_own" on public.outfits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "outfits_delete_own" on public.outfits for delete to authenticated using ((select auth.uid()) = user_id);
create policy "outfit_items_select_own" on public.outfit_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "outfit_items_insert_own" on public.outfit_items for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists(select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid()))
  and exists(select 1 from public.wardrobe_items w where w.id = wardrobe_item_id and w.user_id = (select auth.uid()))
);
create policy "outfit_items_delete_own" on public.outfit_items for delete to authenticated using ((select auth.uid()) = user_id);
create policy "plans_select_own" on public.outfit_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "plans_insert_own" on public.outfit_plans for insert to authenticated with check (
  (select auth.uid()) = user_id
  and (outfit_id is null or exists(select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid())))
);
create policy "plans_update_own" on public.outfit_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "plans_delete_own" on public.outfit_plans for delete to authenticated using ((select auth.uid()) = user_id);
create policy "feedback_select_own" on public.outfit_feedback for select to authenticated using ((select auth.uid()) = user_id);
create policy "feedback_insert_own" on public.outfit_feedback for insert to authenticated with check (
  (select auth.uid()) = user_id and exists(select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid()))
);
create policy "wishlist_select_own" on public.wishlist_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "wishlist_insert_own" on public.wishlist_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "wishlist_update_own" on public.wishlist_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "wishlist_delete_own" on public.wishlist_items for delete to authenticated using ((select auth.uid()) = user_id);
create policy "products_public_approved" on public.products for select to anon, authenticated using (is_active = true and is_approved = true);
create policy "merchant_apps_select_own" on public.merchant_applications for select to authenticated using ((select auth.uid()) = user_id);
create policy "merchant_apps_insert_own" on public.merchant_applications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ai_usage_select_own" on public.ai_usage_daily for select to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe-private', 'wardrobe-private', false, 10485760, ARRAY['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']::text[];
create policy "wardrobe_storage_read_own" on storage.objects for select to authenticated using (bucket_id = 'wardrobe-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "wardrobe_storage_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'wardrobe-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "wardrobe_storage_update_own" on storage.objects for update to authenticated using (bucket_id = 'wardrobe-private' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'wardrobe-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "wardrobe_storage_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'wardrobe-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

grant select, insert, update, delete on public.wardrobe_items to authenticated;
grant select, insert, update, delete on public.outfits to authenticated;
grant select, insert, delete on public.outfit_items to authenticated;
grant select, insert, update, delete on public.outfit_plans to authenticated;
grant select, insert on public.outfit_feedback to authenticated;
grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select on public.products to anon, authenticated;
grant select, insert on public.merchant_applications to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, style_preferences, onboarding_completed, updated_at) on public.profiles to authenticated;


-- OAuth tokens are never exposed through the client Data API. The server stores them encrypted.
create table if not exists public.calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'),
  account_email text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz,
  scopes text[] not null default '{}'::text[],
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.calendar_connections enable row level security;
revoke all on table public.calendar_connections from public, anon, authenticated;
grant all on table public.calendar_connections to service_role;
create trigger calendar_connections_set_updated_at before update on public.calendar_connections
for each row execute procedure public.set_updated_at();
