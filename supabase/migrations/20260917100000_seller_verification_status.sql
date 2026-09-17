-- Seller verification review workflow for admin dashboard.
-- Pending sellers appear in /admin/verifications until approved or rejected.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'seller_verification_status_enum') then
    create type seller_verification_status_enum as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

alter table seller_profiles
  add column if not exists verification_status seller_verification_status_enum;

alter table seller_profiles
  add column if not exists verification_reviewed_at timestamptz;

alter table seller_profiles
  add column if not exists verification_review_note text;

-- Backfill from existing is_verified flag
update seller_profiles
set verification_status = case
  when is_verified then 'approved'::seller_verification_status_enum
  else 'pending'::seller_verification_status_enum
end
where verification_status is null;

alter table seller_profiles
  alter column verification_status set default 'pending'::seller_verification_status_enum;

alter table seller_profiles
  alter column verification_status set not null;

create index if not exists idx_seller_profiles_verification_status
  on seller_profiles (verification_status);
