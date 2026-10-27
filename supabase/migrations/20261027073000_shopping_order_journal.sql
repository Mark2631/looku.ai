-- Private, user-maintained retailer shopping journal. No retailer payment or shipping integration is implied.
create table if not exists public.shopping_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 retailer text not null check (char_length(retailer) between 1 and 120),
 item_title text not null check (char_length(item_title) between 1 and 180),
 product_url text,
 order_reference text,
 tracking_url text,
 status text not null default 'saved' check (status in ('saved','ordered','shipped','delivered','cancelled')),
 note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists shopping_orders_user_created_idx on public.shopping_orders(user_id,created_at desc);
alter table public.shopping_orders enable row level security;
create policy "Owners read shopping orders" on public.shopping_orders for select to authenticated using ((select auth.uid())=user_id);
create policy "Owners create shopping orders" on public.shopping_orders for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owners update shopping orders" on public.shopping_orders for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owners delete shopping orders" on public.shopping_orders for delete to authenticated using ((select auth.uid())=user_id);
grant select,insert,update,delete on public.shopping_orders to authenticated;
