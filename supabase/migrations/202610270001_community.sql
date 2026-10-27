-- LOOKU opt-in community: uploading here is an explicit public publishing action.
-- Public bucket assets must NEVER be used for personal wardrobe or try-on images.
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 70),
  caption text not null default '' check (char_length(caption) <= 1000),
  occasion text not null default 'Everyday' check (char_length(occasion) <= 80),
  public_image_path text,
  visibility text not null default 'public' check (visibility in ('public','hidden')),
  created_at timestamptz not null default now(),
  constraint public_image_folder_check check (public_image_path is null or position(user_id::text || '/' in public_image_path) = 1)
);
create index if not exists community_posts_public_created on public.community_posts(visibility, created_at desc);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('harassment','spam','privacy','inappropriate','other')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);
alter table public.community_posts enable row level security;
alter table public.community_reports enable row level security;
revoke all on public.community_posts from anon,authenticated;
revoke all on public.community_reports from anon,authenticated;
grant select on public.community_posts to anon,authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant select,insert on public.community_reports to authenticated;

create policy community_posts_read on public.community_posts for select to anon,authenticated using (visibility = 'public' or (select auth.uid()) = user_id);
create policy community_posts_insert on public.community_posts for insert to authenticated with check ((select auth.uid()) = user_id and visibility = 'public');
create policy community_posts_update on public.community_posts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy community_posts_delete on public.community_posts for delete to authenticated using ((select auth.uid()) = user_id);
create policy community_reports_read on public.community_reports for select to authenticated using ((select auth.uid()) = reporter_id);
create policy community_reports_insert on public.community_reports for insert to authenticated with check ((select auth.uid()) = reporter_id and exists (select 1 from public.community_posts p where p.id = post_id and p.visibility = 'public' and p.user_id <> (select auth.uid())));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('looku-community','looku-community',true,8388608,array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[];
create policy looku_community_media_insert on storage.objects for insert to authenticated
with check (bucket_id='looku-community' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy looku_community_media_delete on storage.objects for delete to authenticated
using (bucket_id='looku-community' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy looku_community_media_select on storage.objects for select to authenticated
using (bucket_id='looku-community' and (storage.foldername(name))[1]=(select auth.uid())::text);
