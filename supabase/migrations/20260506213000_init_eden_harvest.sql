create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role_enum') then
    create type user_role_enum as enum ('buyer', 'seller');
  end if;

  if not exists (select 1 from pg_type where typname = 'membership_tier_enum') then
    create type membership_tier_enum as enum ('free', 'verified_access');
  end if;

  if not exists (select 1 from pg_type where typname = 'stock_status_enum') then
    create type stock_status_enum as enum (
      'in_season',
      'bulk_available',
      'low_stock',
      'out_of_stock',
      'new_listing'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'reviewer_role_enum') then
    create type reviewer_role_enum as enum ('buyer', 'seller');
  end if;
end
$$;

create table if not exists african_countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  currency_code text not null,
  currency_symbol text not null,
  flag_emoji text not null,
  phone_code text not null,
  verification_types text[] not null default '{}',
  states_regions jsonb not null default '[]'::jsonb
);

create table if not exists buyer_countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  currency_code text not null,
  currency_symbol text not null
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role user_role_enum not null,
  country_code text,
  detected_currency text,
  membership_tier membership_tier_enum not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  farm_name text not null,
  african_country_id uuid not null references african_countries(id),
  state_region text not null,
  local_area text,
  whatsapp_number text not null,
  farm_photo_url text,
  verification_document_type text not null,
  verification_document_value text not null,
  is_verified boolean not null default false,
  verified_at timestamptz,
  average_rating numeric not null default 0,
  total_reviews integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  display_order integer not null default 0
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  product_name text not null,
  category text not null,
  description text,
  price_local numeric not null,
  price_currency_code text not null,
  unit text not null,
  min_order_quantity numeric not null,
  min_order_unit text not null,
  photo_url text,
  stock_status stock_status_enum not null default 'new_listing',
  seasonal_months integer[] not null default '{}',
  is_featured boolean not null default false,
  featured_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exchange_rates (
  id uuid primary key default gen_random_uuid(),
  from_currency text not null,
  to_currency text not null,
  rate numeric not null,
  fetched_at timestamptz not null default now()
);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  review_invite_sent boolean not null default false,
  review_invite_sent_at timestamptz
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references enquiries(id) on delete cascade,
  reviewer_id uuid not null references users(id) on delete cascade,
  reviewee_id uuid not null references users(id) on delete cascade,
  reviewer_role reviewer_role_enum not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_confirmed_purchase boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  reported_user_id uuid not null references users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_membership_tier on users(membership_tier);
create index if not exists idx_seller_profiles_country on seller_profiles(african_country_id);
create index if not exists idx_listings_seller on listings(seller_id);
create index if not exists idx_listings_category on listings(category);
create index if not exists idx_exchange_rates_pair on exchange_rates(from_currency, to_currency);
create index if not exists idx_enquiries_buyer on enquiries(buyer_id);
create index if not exists idx_reviews_reviewee on reviews(reviewee_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_listings_updated_at on listings;
create trigger trg_listings_updated_at
before update on listings
for each row
execute function set_updated_at();

alter table african_countries enable row level security;
alter table buyer_countries enable row level security;
alter table users enable row level security;
alter table seller_profiles enable row level security;
alter table categories enable row level security;
alter table listings enable row level security;
alter table exchange_rates enable row level security;
alter table enquiries enable row level security;
alter table reviews enable row level security;
alter table reports enable row level security;

drop policy if exists "african_countries_read_all" on african_countries;
create policy "african_countries_read_all"
on african_countries for select
using (true);

drop policy if exists "buyer_countries_read_all" on buyer_countries;
create policy "buyer_countries_read_all"
on buyer_countries for select
using (true);

drop policy if exists "users_read_own" on users;
create policy "users_read_own"
on users for select
using (auth.uid() = id);

drop policy if exists "users_insert_own" on users;
create policy "users_insert_own"
on users for insert
with check (auth.uid() = id);

drop policy if exists "users_update_own" on users;
create policy "users_update_own"
on users for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "seller_profiles_read_all" on seller_profiles;
create policy "seller_profiles_read_all"
on seller_profiles for select
using (true);

drop policy if exists "seller_profiles_insert_own" on seller_profiles;
create policy "seller_profiles_insert_own"
on seller_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists "seller_profiles_update_own" on seller_profiles;
create policy "seller_profiles_update_own"
on seller_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "categories_read_all" on categories;
create policy "categories_read_all"
on categories for select
using (true);

drop policy if exists "listings_read_all" on listings;
create policy "listings_read_all"
on listings for select
using (true);

drop policy if exists "listings_insert_owner" on listings;
create policy "listings_insert_owner"
on listings for insert
with check (
  exists (
    select 1
    from seller_profiles sp
    where sp.id = listings.seller_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "listings_update_owner" on listings;
create policy "listings_update_owner"
on listings for update
using (
  exists (
    select 1
    from seller_profiles sp
    where sp.id = listings.seller_id and sp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from seller_profiles sp
    where sp.id = listings.seller_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "exchange_rates_read_all" on exchange_rates;
create policy "exchange_rates_read_all"
on exchange_rates for select
using (true);

drop policy if exists "enquiries_read_participant" on enquiries;
create policy "enquiries_read_participant"
on enquiries for select
using (
  auth.uid() = buyer_id
  or exists (
    select 1 from seller_profiles sp
    where sp.id = enquiries.seller_id and sp.user_id = auth.uid()
  )
);

drop policy if exists "enquiries_insert_buyer" on enquiries;
create policy "enquiries_insert_buyer"
on enquiries for insert
with check (auth.uid() = buyer_id);

drop policy if exists "reviews_read_all" on reviews;
create policy "reviews_read_all"
on reviews for select
using (true);

drop policy if exists "reviews_insert_own" on reviews;
create policy "reviews_insert_own"
on reviews for insert
with check (auth.uid() = reviewer_id);

drop policy if exists "reports_insert_own" on reports;
create policy "reports_insert_own"
on reports for insert
with check (auth.uid() = reporter_id);

drop policy if exists "reports_read_own" on reports;
create policy "reports_read_own"
on reports for select
using (auth.uid() = reporter_id);

revoke select (whatsapp_number) on table seller_profiles from anon, authenticated;
grant select (
  id, user_id, farm_name, african_country_id, state_region, local_area, farm_photo_url,
  verification_document_type, verification_document_value, is_verified, verified_at,
  average_rating, total_reviews, created_at
) on table seller_profiles to anon, authenticated;

create or replace function get_seller_whatsapp(seller_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  current_tier membership_tier_enum;
  whatsapp text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    return null;
  end if;

  select membership_tier
  into current_tier
  from users
  where id = current_user_id;

  if current_tier <> 'verified_access' then
    return null;
  end if;

  select whatsapp_number
  into whatsapp
  from seller_profiles
  where id = seller_profile_id;

  return whatsapp;
end;
$$;

grant execute on function get_seller_whatsapp(uuid) to authenticated;
