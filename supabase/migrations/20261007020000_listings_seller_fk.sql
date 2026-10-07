-- Add the listings.seller_id foreign key that init_eden_harvest declared but
-- which never made it onto the remote database.
--
-- Two consequences of it being absent:
--   * deleting a seller left its listings behind, pointing at a profile id that
--     no longer existed
--   * some rows stored the auth user id instead of the profile id, which
--     fetchRawListings still carries repair code for
--
-- Both have to be cleaned up before the constraint can be added, so this runs
-- rewrite, then delete, then alter. Each step is written to be safe to re-run.

-- 1. Rewrite rows that stored seller_profiles.user_id instead of the profile id.
update listings l
set seller_id = p.id
from seller_profiles p
where l.seller_id = p.user_id
  and not exists (select 1 from seller_profiles q where q.id = l.seller_id);

-- 2. Remove listings whose seller no longer exists. Nothing else can reference
--    them: enquiries.listing_id already cascades, so any attached rows go too.
delete from listings l
where not exists (select 1 from seller_profiles p where p.id = l.seller_id);

-- 3. Add the constraint. The cascade is what stops orphans reappearing the next
--    time an account is deleted.
alter table listings
  drop constraint if exists listings_seller_id_fkey;

alter table listings
  add constraint listings_seller_id_fkey
  foreign key (seller_id) references seller_profiles(id) on delete cascade;
