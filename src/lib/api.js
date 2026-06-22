const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    }

    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
        const message = data?.message || data?.error || `Request failed with status ${response.status}`
        throw new Error(message)
    }

    return data
}

function normalizeTimeValue(value) {
    return String(value ?? '').slice(0, 5)
}

export function toBookedSlotKey(dateKey, startTime) {
    return `${dateKey}|${startTime}`
}

export function rowsToBookedSlotKeySet(rows) {
    const keySet = new Set()
    rows.forEach((row) => {
        keySet.add(toBookedSlotKey(row.slot_date, String(row.start_time).slice(0, 5)))
    })
    return keySet
}

export async function loadBookedRequests(bookingType, windowStartKey, windowEndKey) {
    const params = new URLSearchParams({
        start_date: windowStartKey,
        end_date: windowEndKey,
    })
    if (bookingType) {
        params.set('booking_type', bookingType)
    }

    const data = await request(`/slots/availability?${params.toString()}`)
    return (data ?? []).map((row) => ({
        slot_date: row.slot_date,
        start_time: normalizeTimeValue(row.start_time),
        status: row.status,
    }))
}

export async function createBooking(payload) {
    return request('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function loadAllBookings() {
    return request('/bookings')
}

export async function updateBookingStatus(bookingId, newStatus) {
    return request(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
    })
}