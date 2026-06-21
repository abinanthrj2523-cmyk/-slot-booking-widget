import { createClient } from '@supabase/supabase-js'

const clientCache = new Map()

function normalizeTimeValue(value) {
  return String(value ?? '').slice(0, 5)
}

export function createSupabaseClient(url, anonKey) {
  if (!url || !anonKey) {
    return null
  }

  const cacheKey = `${url}|${anonKey}`
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  clientCache.set(cacheKey, client)
  return client
}

export async function loadBookedRequestsFromSupabase(
  client,
  { bookingType, windowStartKey, windowEndKey },
) {
  const { data, error } = await client
    .from('booking_requests')
    .select('slot_date, start_time, status')
    .eq('booking_type', bookingType)
    .in('status', ['pending', 'confirmed'])
    .gte('slot_date', windowStartKey)
    .lte('slot_date', windowEndKey)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    slot_date: row.slot_date,
    start_time: normalizeTimeValue(row.start_time),
    status: row.status,
  }))
}

export async function createBookingInSupabase(client, payload) {
  const { error } = await client.from('booking_requests').insert(payload)

  if (!error) {
    return
  }

  if (error.code === '23505') {
    throw new Error('That slot is already booked. Please choose another time.')
  }

  throw new Error(error.message)
}
