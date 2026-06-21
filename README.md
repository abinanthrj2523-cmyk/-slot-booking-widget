# Slot Booking Demo (React + Supabase)

Client-ready booking UI with:
- visual calendar (date click),
- fixed daily slot times (6 slots per day),
- slot state handling from DB (`booking_requests`) - booked if request exists, else free,
- booking form (including **country code dropdown + phone input**),
- Supabase integration for live slots and booking requests,
- embeddable plugin build as a web component.

## 1) Local setup

```bash
npm install
cp .env.example .env
```

Set `.env`:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_BOOKING_TYPE=default
```

Run:

```bash
npm run dev
```

## 2) Supabase SQL to run

Run this script in **Supabase SQL Editor**:

`supabase/schema.sql`

This creates required tables and constraints, including an active-slot uniqueness index.

## 3) Build commands

```bash
npm run build          # standalone app
npm run build:widget   # embeddable plugin bundle
npm run build:all      # both
```

## 4) Plugin usage (web component)

After `npm run build:widget`, host `dist/slot-booking-widget.js` and add:

```html
<script type="module" src="/dist/slot-booking-widget.js"></script>

<slot-booking-widget
  supabase-url="https://your-project-id.supabase.co"
  supabase-anon-key="your-public-anon-key"
  booking-type="default"
  title="Book a Consultation"
  location="Google Meet"
  timezone="Europe/Berlin"
  duration-minutes="30"
  approval-required="true"
></slot-booking-widget>
```

## 5) Supabase columns expected by the app

### `booking_requests`
- `reference_code`
- `booking_type`
- `slot_id`
- `slot_date`
- `start_time`
- `end_time`
- `full_name`
- `email`
- `phone`
- `company`
- `meeting_type`
- `notes`
- `status` (`pending`/`confirmed`/`cancelled`)

## 6) Fixed slot rule

By default, every future day has these 6 fixed slots:
- `09:00`
- `09:30`
- `10:00`
- `10:30`
- `14:00`
- `14:30`

A slot is shown as **Booked** only if a row exists in `booking_requests` for the same:
- `booking_type`
- `slot_date`
- `start_time`
with `status` in `pending` or `confirmed`.
