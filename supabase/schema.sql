create extension if not exists pgcrypto;

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  booking_type text not null default 'default',
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'available' check (status in ('available', 'booked')),
  seats_left integer not null default 1 check (seats_left >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_type, slot_date, start_time)
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  booking_type text not null,
  slot_id uuid references public.booking_slots(id) on delete set null,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  full_name text not null,
  email text not null,
  phone text not null,
  company text,
  meeting_type text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists booking_slots_lookup_idx
  on public.booking_slots (booking_type, slot_date, start_time);

create index if not exists booking_requests_lookup_idx
  on public.booking_requests (booking_type, slot_date, created_at desc);

create unique index if not exists booking_requests_active_slot_unique_idx
  on public.booking_requests (booking_type, slot_date, start_time)
  where status in ('pending', 'confirmed');

alter table public.booking_slots enable row level security;
alter table public.booking_requests enable row level security;

drop policy if exists "Public read slots" on public.booking_slots;
create policy "Public read slots"
  on public.booking_slots
  for select
  using (true);

drop policy if exists "Public update slots" on public.booking_slots;
create policy "Public update slots"
  on public.booking_slots
  for update
  using (true)
  with check (true);

drop policy if exists "Public insert requests" on public.booking_requests;
create policy "Public insert requests"
  on public.booking_requests
  for insert
  with check (true);

drop policy if exists "Public read requests" on public.booking_requests;
create policy "Public read requests"
  on public.booking_requests
  for select
  using (true);
