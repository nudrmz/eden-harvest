insert into african_countries (
  name, code, currency_code, currency_symbol, flag_emoji, phone_code, verification_types, states_regions
)
values
  (
    'Nigeria', 'NG', 'NGN', '₦', '🇳🇬', '+234',
    array['NIN', 'CAC'],
    '["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"]'::jsonb
  ),
  (
    'Ghana', 'GH', 'GHS', 'GH₵', '🇬🇭', '+233',
    array['TIN', 'RGD'],
    '["Ahafo","Ashanti","Bono","Bono East","Central","Eastern","Greater Accra","North East","Northern","Oti","Savannah","Upper East","Upper West","Volta","Western","Western North"]'::jsonb
  ),
  (
    'Kenya', 'KE', 'KES', 'KSh', '🇰🇪', '+254',
    array['KRA_PIN', 'BRS'],
    '["Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang''a","Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"]'::jsonb
  ),
  (
    'Ethiopia', 'ET', 'ETB', 'Br', '🇪🇹', '+251',
    array['TIN', 'Trade License'],
    '["Addis Ababa","Afar","Amhara","Benishangul-Gumuz","Dire Dawa","Gambela","Harari","Oromia","Sidama","Somali","South West Ethiopia","Tigray","SNNPR"]'::jsonb
  ),
  (
    'South Africa', 'ZA', 'ZAR', 'R', '🇿🇦', '+27',
    array['Tax Number', 'CIPC'],
    '["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","North West","Northern Cape","Western Cape"]'::jsonb
  ),
  (
    'Tanzania', 'TZ', 'TZS', 'TSh', '🇹🇿', '+255',
    array['TIN', 'BRELA'],
    '["Arusha","Dar es Salaam","Dodoma","Geita","Iringa","Kagera","Katavi","Kigoma","Kilimanjaro","Lindi","Manyara","Mara","Mbeya","Morogoro","Mtwara","Mwanza","Njombe","Pemba North","Pemba South","Pwani","Rukwa","Ruvuma","Shinyanga","Simiyu","Singida","Songwe","Tabora","Tanga","Zanzibar North","Zanzibar South","Zanzibar West"]'::jsonb
  ),
  (
    'Uganda', 'UG', 'UGX', 'USh', '🇺🇬', '+256',
    array['TIN', 'URSB'],
    '["Buganda","Busoga","Acholi","Ankole","Bunyoro","Elgon","Karamoja","Lango","Tooro","Teso"]'::jsonb
  ),
  (
    'Ivory Coast', 'CI', 'XOF', 'CFA', '🇨🇮', '+225',
    array['CC Number', 'RCCM'],
    '["Abidjan","Yamoussoukro","Bouake","San-Pedro","Korhogo","Daloa"]'::jsonb
  ),
  (
    'Cameroon', 'CM', 'XAF', 'FCFA', '🇨🇲', '+237',
    array['TIN', 'RCCM'],
    '["Littoral","Centre","West","Northwest","Southwest","Far North"]'::jsonb
  ),
  (
    'Senegal', 'SN', 'XOF', 'CFA', '🇸🇳', '+221',
    array['NINEA', 'RCCM'],
    '["Dakar","Thies","Saint-Louis","Kaolack","Diourbel","Ziguinchor"]'::jsonb
  ),
  (
    'Mozambique', 'MZ', 'MZN', 'MT', '🇲🇿', '+258',
    array['NUIT', 'Commercial Registration'],
    '["Maputo","Sofala","Nampula","Zambezia","Tete","Gaza"]'::jsonb
  ),
  (
    'Zambia', 'ZM', 'ZMW', 'ZK', '🇿🇲', '+260',
    array['TPIN', 'PACRA'],
    '["Lusaka","Copperbelt","Southern","Central","Eastern","Northern"]'::jsonb
  ),
  (
    'Zimbabwe', 'ZW', 'USD', '$', '🇿🇼', '+263',
    array['TIN', 'CR14'],
    '["Harare","Bulawayo","Manicaland","Mashonaland East","Midlands","Masvingo"]'::jsonb
  ),
  (
    'Malawi', 'MW', 'MWK', 'MK', '🇲🇼', '+265',
    array['TPIN', 'Business Registration'],
    '["Lilongwe","Blantyre","Mzuzu","Zomba","Kasungu","Mangochi"]'::jsonb
  ),
  (
    'Rwanda', 'RW', 'RWF', 'RF', '🇷🇼', '+250',
    array['TIN', 'RDB Registration'],
    '["Eastern","Kigali","Northern","Southern","Western"]'::jsonb
  )
on conflict (code) do update
set
  name = excluded.name,
  currency_code = excluded.currency_code,
  currency_symbol = excluded.currency_symbol,
  flag_emoji = excluded.flag_emoji,
  phone_code = excluded.phone_code,
  verification_types = excluded.verification_types,
  states_regions = excluded.states_regions;

insert into categories (name, slug, icon, display_order)
values
  ('Dried goods', 'dried-goods', 'package', 1),
  ('Grains', 'grains', 'wheat', 2),
  ('Spices', 'spices', 'flame', 3),
  ('Seafood', 'seafood', 'fish', 4),
  ('Oils', 'oils', 'droplets', 5),
  ('Fresh produce', 'fresh-produce', 'leaf', 6),
  ('Livestock', 'livestock', 'beef', 7),
  ('Beverages', 'beverages', 'cup-soda', 8),
  ('Nuts & Seeds', 'nuts-seeds', 'nut', 9),
  ('Roots & Tubers', 'roots-tubers', 'carrot', 10)
on conflict (slug) do update
set
  name = excluded.name,
  icon = excluded.icon,
  display_order = excluded.display_order;

insert into buyer_countries (name, code, currency_code, currency_symbol)
values
  ('United Kingdom', 'GB', 'GBP', '£'),
  ('United States', 'US', 'USD', '$'),
  ('Australia', 'AU', 'AUD', '$'),
  ('Canada', 'CA', 'CAD', '$'),
  ('Germany', 'DE', 'EUR', '€'),
  ('Ireland', 'IE', 'EUR', '€'),
  ('Other', 'OT', 'USD', '$')
on conflict (code) do update
set
  name = excluded.name,
  currency_code = excluded.currency_code,
  currency_symbol = excluded.currency_symbol;
