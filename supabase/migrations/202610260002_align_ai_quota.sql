-- Match the application allowance of 20 AI operations per user per UTC day.
-- SECURITY DEFINER is intentional: authenticated callers may increment only their own row.
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
