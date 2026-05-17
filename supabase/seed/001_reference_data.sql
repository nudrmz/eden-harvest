insert into african_countries (
  name, code, currency_code, currency_symbol, flag_emoji, phone_code, verification_types, states_regions
)
values
  (
    'Nigeria', 'NG', 'NGN', '₦', '🇳🇬', '+234',
    array['NIN', 'CAC'],
    '["Lagos","Kano","Kaduna","Rivers","Oyo","FCT"]'::jsonb
  ),
  (
    'Ghana', 'GH', 'GHS', 'GH₵', '🇬🇭', '+233',
    array['TIN', 'RGD'],
    '["Greater Accra","Ashanti","Northern","Western","Eastern","Volta"]'::jsonb
  ),
  (
    'Kenya', 'KE', 'KES', 'KSh', '🇰🇪', '+254',
    array['KRA_PIN', 'BRS'],
    '["Nairobi","Mombasa","Nakuru","Kiambu","Kisumu","Uasin Gishu"]'::jsonb
  ),
  (
    'Ethiopia', 'ET', 'ETB', 'Br', '🇪🇹', '+251',
    array['TIN', 'Trade License'],
    '["Addis Ababa","Oromia","Amhara","Tigray","Sidama","SNNPR"]'::jsonb
  ),
  (
    'South Africa', 'ZA', 'ZAR', 'R', '🇿🇦', '+27',
    array['Tax Number', 'CIPC'],
    '["Gauteng","Western Cape","KwaZulu-Natal","Eastern Cape","Limpopo","Free State"]'::jsonb
  ),
  (
    'Tanzania', 'TZ', 'TZS', 'TSh', '🇹🇿', '+255',
    array['TIN', 'BRELA'],
    '["Dar es Salaam","Arusha","Mwanza","Dodoma","Mbeya","Morogoro"]'::jsonb
  ),
  (
    'Uganda', 'UG', 'UGX', 'USh', '🇺🇬', '+256',
    array['TIN', 'URSB'],
    '["Kampala","Wakiso","Gulu","Mbarara","Jinja","Mbale"]'::jsonb
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
    '["Kigali","Northern","Southern","Eastern","Western","Gasabo"]'::jsonb
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
