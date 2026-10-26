-- LOOKU optional virtual try-on jobs and a small daily quota.
-- Apply after 202610260001_initial_schema.sql in the dedicated LOOKU backend.

create table if not exists public.tryon_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default (timezone('utc', now()))::date,
  call_count integer not null default 0 check (call_count >= 0),
  primary key (user_id, usage_date)
);
alter table public.tryon_usage_daily enable row level security;
revoke all on table public.tryon_usage_daily from public, anon, authenticated;
grant select, insert, update on public.tryon_usage_daily to service_role;

create or replace function public.consume_tryon_quota(p_daily_limit integer default 2)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid; v_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null or p_daily_limit < 1 or p_daily_limit > 5 then return false; end if;
  insert into public.tryon_usage_daily (user_id, usage_date, call_count)
  values (v_user_id, (timezone('utc', now()))::date, 1)
  on conflict (user_id, usage_date)
  do update set call_count = public.tryon_usage_daily.call_count + 1
  where public.tryon_usage_daily.call_count < p_daily_limit
  returning call_count into v_count;
  return v_count is not null;
end;
$$;
revoke all on function public.consume_tryon_quota(integer) from public, anon;
grant execute on function public.consume_tryon_quota(integer) to authenticated;

create table if not exists public.tryon_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  provider text not null default 'fashn',
  provider_job_id text unique,
  model_image_path text not null,
  result_image_path text,
  status text not null default 'starting' check (status in ('starting','queued','processing','completed','failed')),
  error_message text,
  generation_mode text not null default 'fast' check (generation_mode in ('fast','balanced','quality')),
  resolution text not null default '1k' check (resolution in ('1k','2k','4k')),
  credits_used numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tryon_jobs_user_created_idx on public.tryon_jobs(user_id, created_at desc);
create index if not exists tryon_jobs_user_status_idx on public.tryon_jobs(user_id, status);
drop trigger if exists tryon_jobs_set_updated_at on public.tryon_jobs;
create trigger tryon_jobs_set_updated_at before update on public.tryon_jobs
for each row execute procedure public.set_updated_at();

alter table public.tryon_jobs enable row level security;
create policy "tryon_jobs_select_own" on public.tryon_jobs for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.tryon_jobs from public, anon, authenticated;
grant select on public.tryon_jobs to authenticated;
grant all on public.tryon_jobs to service_role;

-- A completed or failed job is always user-scoped in server code as well as by RLS.
