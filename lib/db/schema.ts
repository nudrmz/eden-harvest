/**
 * Database changes the app needs, applied by the admin "Set up database"
 * button (see app/api/admin/db/setup). Every statement is safe to run more
 * than once. Keep supabase/migrations/20261115120000_orders.sql in step.
 *
 * Tables are only read and written by server routes with the service-role
 * key, so RLS is on with no policies: the browser can't touch them directly.
 */
export const SCHEMA_VERSION = "2026-11-15-orders-v1";

export const SCHEMA_SQL = `
create extension if not exists pgcrypto;

-- Delivery details on each listing (the farmer arranges delivery).
alter table listings add column if not exists delivery_fee numeric not null default 0;
alter table listings add column if not exists delivery_note text;

-- Orders: one listing per order.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_id uuid not null references users(id) on delete restrict,
  seller_id uuid not null references seller_profiles(id) on delete restrict,
  listing_id uuid references listings(id) on delete set null,
  product_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  unit_price numeric not null check (unit_price >= 0),
  subtotal numeric not null,
  delivery_fee numeric not null default 0,
  total numeric not null,
  currency text not null,
  commission_rate numeric not null,
  commission_amount numeric not null,
  seller_payout numeric not null,
  status text not null default 'pending_payment' check (status in
    ('pending_payment','paid','dispatched','completed','disputed','refunded','cancelled')),
  payment_provider text,
  payment_reference text unique,
  paid_at timestamptz,
  dispatch_due_at timestamptz,
  dispatched_at timestamptz,
  dispatch_note text,
  dispatch_proof_url text,
  auto_release_at timestamptz,
  completed_at timestamptz,
  completed_by text,
  payout_status text not null default 'not_due' check (payout_status in
    ('not_due','due','processing','paid','failed','cancelled')),
  payout_reference text,
  payout_paid_at timestamptz,
  refund_amount numeric,
  refunded_at timestamptz,
  delivery_name text,
  delivery_phone text,
  delivery_address text,
  buyer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_buyer on orders(buyer_id, created_at desc);
create index if not exists idx_orders_seller on orders(seller_id, created_at desc);
create index if not exists idx_orders_status on orders(status);
alter table orders enable row level security;

-- Problems reported by buyers on an order.
create table if not exists order_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  opened_by uuid not null references users(id),
  reason text not null,
  details text,
  photo_urls text[] not null default '{}',
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text check (resolution in ('refund_full','refund_partial','release_to_seller')),
  refund_amount numeric,
  admin_note text,
  resolved_by uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_disputes_order on order_disputes(order_id);
create index if not exists idx_disputes_status on order_disputes(status);
alter table order_disputes enable row level security;

-- Where each farmer is paid (private: service role only).
create table if not exists seller_payout_accounts (
  seller_id uuid primary key references seller_profiles(id) on delete cascade,
  bank_code text not null,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  currency text not null default 'NGN',
  paystack_recipient_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table seller_payout_accounts enable row level security;

-- Records which schema version has been applied.
create table if not exists app_schema_versions (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table app_schema_versions enable row level security;
insert into app_schema_versions(version) values ('${"2026-11-15-orders-v1"}') on conflict do nothing;
`;
