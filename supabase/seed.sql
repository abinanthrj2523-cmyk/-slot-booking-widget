-- Seed demo availability for booking_type = 'default'
-- Safe to run multiple times (uses UPSERT on unique key).

with upcoming_days as (
  select (current_date + offset_day)::date as slot_date
  from generate_series(1, 30) as offset_day
  where extract(isodow from (current_date + offset_day)) between 1 and 5
),
time_templates as (
  select start_time
  from (
    values
      ('09:00'::time),
      ('09:30'::time),
      ('10:00'::time),
      ('10:30'::time),
      ('14:00'::time),
      ('14:30'::time)
  ) as t(start_time)
),
generated_slots as (
  select
    'default'::text as booking_type,
    d.slot_date,
    t.start_time,
    (t.start_time + interval '30 minutes')::time as end_time,
    case
      when ((extract(day from d.slot_date)::int + extract(hour from t.start_time)::int) % 5 = 0)
        then 'booked'
      else 'available'
    end::text as status,
    case
      when ((extract(day from d.slot_date)::int + extract(hour from t.start_time)::int) % 5 = 0)
        then 0
      else 1
    end::int as seats_left
  from upcoming_days d
  cross join time_templates t
)
insert into public.booking_slots (
  booking_type,
  slot_date,
  start_time,
  end_time,
  status,
  seats_left
)
select
  booking_type,
  slot_date,
  start_time,
  end_time,
  status,
  seats_left
from generated_slots
on conflict (booking_type, slot_date, start_time)
do update set
  end_time = excluded.end_time,
  status = excluded.status,
  seats_left = excluded.seats_left,
  updated_at = now();
