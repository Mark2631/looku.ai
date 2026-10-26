-- Manually researched external product references. Not merchant inventory, no image licence claimed.
-- Public fields are source facts at research time; never assert current stock or retailer relationship.
create table if not exists public.external_product_picks (
  id text primary key,
  title text not null check (char_length(title) between 3 and 180),
  merchant_name text not null,
  category text not null,
  style_tags text[] not null default '{}',
  occasion_tags text[] not null default '{}',
  observed_price_kes numeric(12,2) check (observed_price_kes is null or observed_price_kes >= 0),
  product_url text not null check (product_url like 'https://%'),
  research_source_url text not null check (research_source_url like 'https://%'),
  review_note text not null default 'Public retailer listing; current stock, sizing and price are not verified.',
  image_url text,
  is_active boolean not null default true,
  reviewed_at date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now()
);
alter table public.external_product_picks enable row level security;
drop policy if exists "Read researched external product picks" on public.external_product_picks;
create policy "Read researched external product picks" on public.external_product_picks
for select to anon, authenticated using (is_active=true);
revoke all on public.external_product_picks from anon, authenticated;
grant select on public.external_product_picks to anon, authenticated;

insert into public.external_product_picks
(id,title,merchant_name,category,style_tags,occasion_tags,observed_price_kes,product_url,research_source_url,review_note,image_url)
values
('ikojn-monroe-pink','Monroe Fitted Dress in Pink','Ikojn','Dresses',array['classic elegance','smart casual','minimal'],array['Birthday','Dinner','Date night','Photoshoot'],4999,'https://www.ikojn.com/products/monroe-fitted-dress-in-pink','https://www.ikojn.com/collections/dresses','Listed in a public Ikojn collection; price is a research snapshot, stock/size/price must be checked on seller site.',null),
('ikojn-monroe-scarlet','Monroe Fitted Dress in Scarlet','Ikojn','Dresses',array['classic elegance','bold','colorful creative'],array['Birthday','Dinner','Date night','Photoshoot'],4999,'https://www.ikojn.com/products/monroe-fitted-dress-in-scarlet','https://www.ikojn.com/collections/dresses','Research-only external reference; verify color, size, price and availability with Ikojn.',null),
('ikojn-casso-mini','Casso Mini Lily Dress','Ikojn','Dresses',array['colorful creative','bold','expressive'],array['Birthday','Campus event','Photoshoot'],3999,'https://www.ikojn.com/products/casso-mini-lily-dress','https://www.ikojn.com/collections/dresses','Research-only external reference; check current price and whether item is in stock.',null),
('ikojn-iris-mini','Iris Mini Lily Dress','Ikojn','Dresses',array['colorful creative','expressive','bold'],array['Birthday','Concert / festival','Photoshoot'],3999,'https://www.ikojn.com/products/iris-mini-lily-dress','https://www.ikojn.com/collections/dresses','Research-only external reference, not a live merchant feed.',null),
('ikojn-vouge-mini','Vouge Ankara Mini Dress','Ikojn','Dresses',array['colorful creative','bold','celebration'],array['Birthday','Photoshoot','Family celebration'],5499,'https://www.ikojn.com/products/vouge-ankara-mini-dress','https://www.ikojn.com/collections/dresses','Research-only external reference; listed price is not a checkout quotation.',null),
('ikojn-aura-choco','Aura Knitted Dress in Choco','Ikojn','Dresses',array['classic elegance','relaxed minimal','neutral'],array['Date night','Dinner','Birthday'],4200,'https://www.ikojn.com/products/aura-knited-dress-in-choco','https://www.ikojn.com/collections/dresses','Research-only external reference; availability and size not verified.',null)
on conflict (id) do update set title=excluded.title,merchant_name=excluded.merchant_name,category=excluded.category,style_tags=excluded.style_tags,occasion_tags=excluded.occasion_tags,observed_price_kes=excluded.observed_price_kes,product_url=excluded.product_url,research_source_url=excluded.research_source_url,review_note=excluded.review_note;
