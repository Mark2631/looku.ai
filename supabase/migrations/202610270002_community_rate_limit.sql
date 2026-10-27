-- LOOKU community upload safety: max five public posts per user per rolling 24 hours.
-- Function is invoker; RLS permits each member to see their own posts.
create or replace function public.limit_looku_community_posts()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_count integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Sign in to publish your own LOOKU content.' using errcode='42501';
  end if;
  select count(*) into v_count from public.community_posts
  where user_id = new.user_id and created_at > now() - interval '24 hours';
  if v_count >= 5 then
    raise exception 'You can share up to five LOOKU community posts per day.' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_looku_community_posts() from public,anon,authenticated;
drop trigger if exists limit_looku_public_posts on public.community_posts;
create trigger limit_looku_public_posts before insert on public.community_posts
for each row execute procedure public.limit_looku_community_posts();
