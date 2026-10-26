-- Extend LOOKU's occasion playbook and garment vocabulary for real-world use.
alter table public.wardrobe_items drop constraint if exists wardrobe_items_category_check;
alter table public.wardrobe_items add constraint wardrobe_items_category_check
  check (category in ('Tops','Bottoms','Shoes','Outerwear','Dresses','Swimwear','Accessories','Activewear','Sleepwear','Bags','Other'));

insert into public.occasion_playbooks
(id,occasion,display_name,dress_codes,priorities,styling_guidance,shopping_guidance,cultural_note,source_urls,sort_order)
values
('conference-networking','Conference / networking','Conference and networking','{"Polished","Smart casual","Conference dress code"}','{"all-day comfort","professional context","layers","walking"}','Start with the organizer''s dress guidance and the role or community. Plan for a long day, movement, temperature changes and practical pockets. Avoid treating one aesthetic as a proxy for competence.','Use owned smart-casual or professional pieces first. Buy only if an important functional gap remains, and prefer items reusable across work and campus.','Professional norms differ by country, industry and culture. Do not infer what the user should wear from their job title alone.','{"https://extension.usu.edu/research/principles-of-design","https://doi.org/10.1145/3702327"}',170),
('concert-festival','Concert / festival','Concert and festival','{"Expressive casual","Venue-led","Comfort-first"}','{"movement","venue rules","weather","comfortable footwear"}','Balance self-expression with venue rules, terrain, crowd movement and verified weather if available. Recommend layers or bags only when useful and permitted.','Try owned outfits and accessories first. If a real gap exists, prioritize comfort and repeat use rather than an event-only purchase.','Music scenes and cultural expectations vary. Avoid assumptions about gender, body shape, identity or desired exposure.','{"https://extension.usu.edu/research/principles-of-design","https://www.whering.co/"}',180),
('beach-pool','Beach or pool day','Beach or pool day','{"Activity-led","Casual","User preference"}','{"swimwear","comfort","sun protection","cover-up preference","footwear"}','For water activities, start with swimwear and activity-suitable pieces. Discuss cover-ups, sun protection and footwear as context-sensitive options, not universal requirements. Never infer a user''s body, modesty preference or willingness to wear swimwear.','Use swimwear and accessories already owned when suitable. For a true gap, compare material/function and budget, and do not invent retailer stock or fit claims.','Coverage, modesty, body confidence and activity requirements are personal. Ask the user what they are comfortable wearing.','{"https://extension.usu.edu/research/principles-of-design","https://www.unep.org/resources/report/sustainability-and-circularity-textile-value-chain-global-roadmap"}',190),
('photoshoot','Photoshoot','Photoshoot or personal styling session','{"Creative brief","Editorial","User-defined"}','{"background","lighting","movement","camera framing","brief"}','Use the actual creative brief and background. Offer color and texture alternatives where garment metadata supports them. Do not promise that clothing will photograph perfectly without a test image.','Reuse items that work together and test the outfit before buying anything. If purchasing, choose a garment useful beyond one shoot.','Ask about styling goals and consent. Do not infer the purpose, audience or identity represented in a shoot.','{"https://extension.usu.edu/research/principles-of-design","https://doi.org/10.1609/aaai.v38i8.28764"}',200),
('baby-shower','Baby shower','Baby shower','{"Smart casual","Host-led","Celebratory"}','{"host dress code","comfort","venue","movement"}','Follow the host''s guidance and venue. Offer comfortable, polished choices with no assumptions about the attendee''s relationship to the parent or family.','Build from owned pieces and accessories. Shop only for a confirmed dress-code or weather gap, not simply because the event is celebratory.','Family traditions, beliefs and guest roles vary; use the user''s stated context rather than guessing.','{"https://extension.usu.edu/research/principles-of-design","https://doi.org/10.1371/journal.pone.0102772"}',210),
('first-day-work','First day at work','First day at work','{"Workplace-led","Smart casual","Polished"}','{"employer guidance","commute","comfort","versatility"}','Match the employer''s stated dress expectations. Prioritize comfortable movement and practical footwear; offer options for different workplace norms without judging professionalism by appearance.','Reuse the closet first. If a gap is real, prioritize an item that works for several workdays and avoid pressuring the user to overspend for a first impression.','Do not assume industry, gender, seniority, body shape or income. Avoid linking appearance to competence.','{"https://extension.usu.edu/research/principles-of-design","https://doi.org/10.1108/JFMM-07-2024-0284"}',220)
on conflict (id) do update set
  occasion=excluded.occasion,
  display_name=excluded.display_name,
  dress_codes=excluded.dress_codes,
  priorities=excluded.priorities,
  styling_guidance=excluded.styling_guidance,
  shopping_guidance=excluded.shopping_guidance,
  cultural_note=excluded.cultural_note,
  source_urls=excluded.source_urls,
  sort_order=excluded.sort_order,
  updated_at=now();

insert into public.shopping_gap_guides
(id,occasion,category,when_to_consider,alternatives,budget_guidance,source_urls)
values
('conference-footwear','Conference / networking','Shoes','Only if owned shoes are uncomfortable for standing or unsuitable for the stated dress code.','Use a clean, comfortable pair already owned; check walking and standing before the event.','Do not spend the full budget to look professional; choose shoes that work across several days.','{"https://extension.usu.edu/research/principles-of-design"}'),
('conference-layer','Conference / networking','Outerwear','When venue temperature, travel or a known dress code makes a layer useful.','Rewear a blazer, cardigan or overshirt already in the wardrobe.','A versatile layer is preferable to a single-use purchase.','{"https://extension.usu.edu/research/principles-of-design"}'),
('festival-shoes','Concert / festival','Shoes','When terrain, standing time or venue conditions make current shoes impractical.','Use secure, comfortable shoes already owned and allowed by venue rules.','Prioritize comfort and durability over trend or brand.','{"https://extension.usu.edu/research/principles-of-design"}'),
('festival-layer','Concert / festival','Outerwear','Only when verified weather, event timing or venue rules justify an extra layer.','Pack an owned light layer or borrow one.','Do not buy a jacket based on guessed weather.','{"https://www.whering.co/"}'),
('beach-swimwear','Beach or pool day','Swimwear','If the user intends to enter the water and has no suitable swimwear they feel comfortable wearing.','Consider owned activity-suitable garments where appropriate, borrowing, or another activity if the user prefers not to swim.','Respect comfort and modesty preferences. Never infer sizing or fit from a product photo.','{"https://extension.usu.edu/research/principles-of-design"}'),
('beach-footwear','Beach or pool day','Shoes','When the planned terrain or activity calls for water-safe or secure footwear.','Use owned footwear that is safe for the activity and terrain.','Avoid buying a pair for a single outing unless safety/function requires it.','{"https://extension.usu.edu/research/principles-of-design"}'),
('photoshoot-color','Photoshoot','Tops','Only when the creative brief or background makes the available pieces unsuitable.','Test owned tops against the background and lighting before shopping.','Try the camera first; buy only for a confirmed gap.','{"https://extension.usu.edu/research/principles-of-design"}'),
('photoshoot-accessory','Photoshoot','Accessories','When the brief calls for a specific styling detail and owned accessories do not fit.','Use owned accessories or styling techniques agreed with the photographer.','Avoid single-use purchases if a borrowed or owned option works.','{"https://doi.org/10.1609/aaai.v38i8.28764"}'),
('baby-shower-shoes','Baby shower','Shoes','When current shoes are unsuitable for the venue, standing or movement needs.','Choose a comfortable pair already owned.','Avoid an event-only purchase if a suitable option is already available.','{"https://extension.usu.edu/research/principles-of-design"}'),
('first-day-work-layer','First day at work','Outerwear','When the employer''s stated dress code, commute or venue requires it.','Use an owned neutral layer that works with multiple combinations.','Choose rewearable pieces and stay within the user''s stated cap.','{"https://extension.usu.edu/research/principles-of-design"}')
on conflict (id) do update set
  occasion=excluded.occasion,
  category=excluded.category,
  when_to_consider=excluded.when_to_consider,
  alternatives=excluded.alternatives,
  budget_guidance=excluded.budget_guidance,
  source_urls=excluded.source_urls,
  updated_at=now();
