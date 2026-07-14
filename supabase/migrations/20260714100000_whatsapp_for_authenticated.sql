-- Allow any signed-in buyer to reveal WhatsApp after they can create enquiries.
-- Verified Access is still used for other premium features in the app.
create or replace function get_seller_whatsapp(seller_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  whatsapp text;
begin
  if auth.uid() is null then
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
