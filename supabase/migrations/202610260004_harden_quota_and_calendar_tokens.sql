-- Harden daily AI quota enforcement without granting a SECURITY DEFINER RPC to users.
-- RLS restricts rows to the active user; the trigger prevents quota edits/reset from bypassing limits.
create or replace function public.guard_ai_usage_daily()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor uuid;
  v_today date;
begin
  v_actor := auth.uid();
  v_today := (timezone('utc', now()))::date;
  if v_actor is null then
    raise exception 'A signed-in user is required to update AI usage.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.user_id <> v_actor or new.usage_date <> v_today or new.call_count <> 1 then
      raise exception 'Invalid AI usage insert.' using errcode = '42501';
    end if;
  else
    if old.user_id <> v_actor
      or new.user_id <> v_actor
      or old.usage_date <> v_today
      or new.usage_date <> v_today
      or old.call_count >= 20
      or new.call_count <> old.call_count + 1 then
      raise exception 'AI usage may only be incremented by one up to the daily limit.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_ai_usage_daily() from public, anon, authenticated;

drop trigger if exists guard_ai_usage_daily_write on public.ai_usage_daily;
create trigger guard_ai_usage_daily_write
before insert or update on public.ai_usage_daily
for each row execute procedure public.guard_ai_usage_daily();

drop policy if exists ai_usage_insert_own on public.ai_usage_daily;
create policy ai_usage_insert_own on public.ai_usage_daily
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and usage_date = (timezone('utc', now()))::date
  and call_count = 1
);

drop policy if exists ai_usage_update_own on public.ai_usage_daily;
create policy ai_usage_update_own on public.ai_usage_daily
for update to authenticated
using (
  (select auth.uid()) = user_id
  and usage_date = (timezone('utc', now()))::date
  and call_count < 20
)
with check (
  (select auth.uid()) = user_id
  and usage_date = (timezone('utc', now()))::date
  and call_count <= 20
);

revoke all on table public.ai_usage_daily from anon, authenticated;
grant select, insert, update on table public.ai_usage_daily to authenticated;
drop policy if exists ai_usage_select_own on public.ai_usage_daily;
create policy ai_usage_select_own on public.ai_usage_daily
for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.consume_ai_quota()
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_count integer;
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

-- Private OAuth refresh tokens are only accessed by server routes using the service role.
revoke all on table public.calendar_connections from anon, authenticated;
drop policy if exists calendar_connections_service_role_only on public.calendar_connections;
create policy calendar_connections_service_role_only on public.calendar_connections
for all to service_role using (true) with check (true);
