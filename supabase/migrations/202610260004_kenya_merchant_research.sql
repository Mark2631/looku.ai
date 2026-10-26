create table if not exists public.merchant_sources (
  id text primary key,
  name text not null,
  website text not null,
  country_code text[] not null default ARRAY['KE']::text[],
  categories text[] not null default '{}',
  business_model text not null,
  integration_path text not null,
  public_evidence text not null,
  source_url text not null,
  relationship_status text not null default 'research_only' check (relationship_status in ('research_only','contacted','approved','declined')),
  updated_at timestamptz not null default now()
);
alter table public.merchant_sources enable row level security;
drop policy if exists "Public can read merchant research sources" on public.merchant_sources;
create policy "Public can read merchant research sources" on public.merchant_sources for select to anon, authenticated using (true);
revoke insert, update, delete, truncate, references, trigger on public.merchant_sources from anon, authenticated;
insert into public.merchant_sources(id,name,website,country_code,categories,business_model,integration_path,public_evidence,source_url,relationship_status) values
('shopzetu','Shop Zetu','https://www.shopzetu.com/','{"KE"}','{"clothing","shoes","accessories","multi-brand"}','Multi-brand online fashion marketplace','Request an authorized product feed, affiliate relationship, or written permission for catalog images and product metadata. Until approved, provide a clearly labelled external link only.','Public storefront shows multiple fashion brands and KSh-denominated product listings; partnership and feed rights are not established.','https://www.shopzetu.com/','research_only'),
('jumia-kenya-fashion','Jumia Kenya Fashion','https://www.jumia.co.ke/category-fashion-by-jumia/','{"KE"}','{"clothing","shoes","bags","accessories","multi-brand"}','Large online marketplace with a fashion category','Investigate current affiliate/partner terms and product data access. Do not scrape, republish photos, or cache price/stock without rights.','Public fashion category and product pages exist; LOOKU has no established commercial relationship.','https://www.jumia.co.ke/category-fashion-by-jumia/','research_only'),
('leorana','Leorana','https://leorana.com/','{"KE"}','{"clothing","shoes","brand-led"}','Online fashion retailer serving Kenya','Contact retailer for approved catalog/affiliate options, size and stock feeds, and image usage terms.','Public site describes multi-brand fashion retail and Kenya delivery; feed permissions are unverified.','https://leorana.com/','research_only'),
('nawiri','NAWIRI','https://nawirionline.co.ke/','{"KE"}','{"clothing","locally-designed","size-inclusive"}','Nairobi-based fashion brand and online store','Approach directly for product partnership and permission; avoid scraping product imagery or making stock claims.','Public site describes locally made, size-inclusive apparel and a Nairobi presence.','https://nawirionline.co.ke/','research_only'),
('access-nairobi','ACCESS','https://access.co.ke/','{"KE"}','{"clothing","footwear","accessories","local-design"}','Nairobi fashion retail/wholesale brand','Contact for a direct merchant agreement, approved images, stock freshness and attribution rules.','Public storefront presents Nairobi-designed clothing, footwear and accessories; integration permission not verified.','https://access.co.ke/','research_only'),
('iko-jn','Ikojn','https://www.ikojn.com/','{"KE"}','{"clothing","womenswear","local-design"}','Kenyan womenswear brand','Explore direct merchant or affiliate relationship with clear catalog/image rights and live pricing terms.','Public storefront describes made-in-Kenya womenswear and product listings; no LOOKU relationship established.','https://www.ikojn.com/','research_only'),
('zuri-market','Zuri Market','https://www.zurimarket.co.ke/','{"KE"}','{"clothing","shoes","bags","accessories","local-designers"}','Kenyan fashion marketplace connecting vendors and buyers','Explore a marketplace integration or vendor referrals; confirm merchant verification, order handling and attribution with operator.','Public site presents Kenyan vendors, local fashion and direct ordering; no LOOKU partnership established.','https://www.zurimarket.co.ke/','research_only'),
('tiankara','Tiankara Creations','https://tiankara.com/','{"KE"}','{"clothing","accessories","local-retail"}','Fashion e-commerce and retail','Contact directly about catalog rights, stock and delivery coverage before showing individual items.','Public site lists fashion categories, prices and physical retail/contact information; integration terms unverified.','https://tiankara.com/','research_only')
on conflict(id) do update set name=excluded.name,website=excluded.website,country_code=excluded.country_code,categories=excluded.categories,business_model=excluded.business_model,integration_path=excluded.integration_path,public_evidence=excluded.public_evidence,source_url=excluded.source_url,relationship_status='research_only',updated_at=now();
