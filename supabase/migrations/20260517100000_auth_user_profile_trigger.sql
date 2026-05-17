-- Auto-create public.users when a new auth user is created (covers email-confirmation signups).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role user_role_enum;
  country text;
  detected text;
begin
  user_role := case
    when coalesce(new.raw_user_meta_data->>'role', '') = 'seller' then 'seller'::user_role_enum
    else 'buyer'::user_role_enum
  end;

  country := nullif(trim(coalesce(new.raw_user_meta_data->>'country_code', '')), '');

  if user_role = 'buyer' and country is not null then
    detected := case country
      when 'GB' then 'GBP'
      when 'US' then 'USD'
      when 'AU' then 'AUD'
      when 'CA' then 'CAD'
      when 'DE' then 'EUR'
      when 'IE' then 'EUR'
      else 'USD'
    end;
  else
    detected := null;
  end if;

  insert into public.users (
    id,
    email,
    full_name,
    role,
    country_code,
    detected_currency,
    membership_tier
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
      split_part(new.email, '@', 1)
    ),
    user_role,
    case when user_role = 'buyer' then country else null end,
    detected,
    'free'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
