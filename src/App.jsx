import { useEffect, useMemo, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import {
  createBookingInSupabase,
  createSupabaseClient,
  loadBookedRequestsFromSupabase,
} from './lib/supabase.js'

const defaultBookingConfig = {
  title: 'Book a Consultation',
  durationMinutes: 30,
  timezone: 'Europe/Berlin',
  approvalRequired: true,
  location: 'Google Meet',
}

const meetingTypeOptions = [
  'Career Consultation',
  'CV Review',
  'Interview Preparation',
  'General Discovery Call',
]

const countryCodeOptions = [
  { value: '+49', label: 'Germany (+49)' },
  { value: '+44', label: 'United Kingdom (+44)' },
  { value: '+33', label: 'France (+33)' },
  { value: '+39', label: 'Italy (+39)' },
  { value: '+31', label: 'Netherlands (+31)' },
  { value: '+34', label: 'Spain (+34)' },
  { value: '+1', label: 'USA/Canada (+1)' },
  { value: '+91', label: 'India (+91)' },
]

const fixedDailySlotTimes = ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30']

const initialFormData = {
  fullName: '',
  email: '',
  countryCode: '+49',
  phoneNumber: '',
  company: '',
  meetingType: '',
  notes: '',
  privacyAccepted: false,
}

function getTomorrow() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 1)
  return date
}

function startOfMonth(dateValue) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), 1)
}

function endOfMonth(dateValue) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth() + 1, 0)
}

function addDays(dateValue, daysToAdd) {
  const nextDate = new Date(dateValue)
  nextDate.setDate(nextDate.getDate() + daysToAdd)
  return nextDate
}

function addMinutes(timeValue, minutesToAdd) {
  const [hours, minutes] = timeValue.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + minutesToAdd
  const nextHours = Math.floor(totalMinutes / 60)
  const nextMinutes = totalMinutes % 60
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`
}

function formatDateKey(dateValue) {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatShortDateLabel(dateKey) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parseDateKey(dateKey))
}

function parseBooleanAttribute(value, fallbackValue) {
  if (value === undefined || value === null || value === '') {
    return fallbackValue
  }
  return value.toLowerCase() === 'true'
}

function parseNumberAttribute(value, fallbackValue) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue
}

function createEmptySlotsByRange(startDate, endDate) {
  const slotsByDate = {}
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const date = addDays(startDate, dayIndex)
    slotsByDate[formatDateKey(date)] = []
  }

  return slotsByDate
}

function toBookedSlotKey(dateKey, startTime) {
  return `${dateKey}|${startTime}`
}

function rowsToBookedSlotKeySet(rows) {
  const keySet = new Set()
  rows.forEach((row) => {
    keySet.add(toBookedSlotKey(row.slot_date, String(row.start_time).slice(0, 5)))
  })
  return keySet
}

function buildFixedSlotsForRange(durationMinutes, startDate, endDate, bookedSlotKeySet = new Set()) {
  const slotsByDate = createEmptySlotsByRange(startDate, endDate)

  Object.keys(slotsByDate).forEach((dateKey) => {
    slotsByDate[dateKey] = fixedDailySlotTimes.map((startTime) => {
      const slotKey = toBookedSlotKey(dateKey, startTime)
      const isBooked = bookedSlotKeySet.has(slotKey)

      return {
        id: `${dateKey}-${startTime}`,
        dateKey,
        startTime,
        endTime: addMinutes(startTime, durationMinutes),
        status: isBooked ? 'booked' : 'available',
      }
    })
  })

  return slotsByDate
}

function mergeSlots(currentSlotsByDate, nextRangeSlots) {
  return { ...currentSlotsByDate, ...nextRangeSlots }
}

function applyBookedSlot(slotsByDate, dateKey, slotId) {
  return {
    ...slotsByDate,
    [dateKey]: (slotsByDate[dateKey] ?? []).map((slot) =>
      slot.id === slotId ? { ...slot, status: 'booked' } : slot,
    ),
  }
}

function getDateStatus(slotsByDate, dateKey) {
  const slots = slotsByDate[dateKey] ?? []
  const hasAvailable = slots.some((slot) => slot.status === 'available')
  const hasAny = slots.length > 0
  const isFull = hasAny && !hasAvailable
  return { hasAvailable, hasAny, isFull }
}

function App({
  embedded = false,
  supabaseUrl,
  supabaseAnonKey,
  bookingType,
  configOverrides = {},
}) {
  const bookingConfig = {
    ...defaultBookingConfig,
    ...configOverrides,
    durationMinutes: parseNumberAttribute(
      configOverrides.durationMinutes,
      defaultBookingConfig.durationMinutes,
    ),
    approvalRequired: parseBooleanAttribute(
      configOverrides.approvalRequired,
      defaultBookingConfig.approvalRequired,
    ),
  }

  const minSelectableDate = useMemo(() => getTomorrow(), [])
  const [selectedDate, setSelectedDate] = useState(() => getTomorrow())
  const [activeStartDate, setActiveStartDate] = useState(() => startOfMonth(getTomorrow()))
  const [selectedSlotId, setSelectedSlotId] = useState('')

  const selectedDateKey = formatDateKey(selectedDate)
  const monthKey = `${activeStartDate.getFullYear()}-${activeStartDate.getMonth()}`

  const resolvedSupabaseUrl = supabaseUrl ?? import.meta.env.VITE_SUPABASE_URL ?? ''
  const resolvedSupabaseAnonKey = supabaseAnonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
  const resolvedBookingType = bookingType ?? import.meta.env.VITE_BOOKING_TYPE ?? 'default'

  const supabaseClient = useMemo(
    () => createSupabaseClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey),
    [resolvedSupabaseUrl, resolvedSupabaseAnonKey],
  )

  const [slotsByDate, setSlotsByDate] = useState({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [requestCounter, setRequestCounter] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [submittedBooking, setSubmittedBooking] = useState(null)
  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    let ignore = false

    async function loadMonthSlots() {
      setLoadingSlots(true)
      const monthStart = startOfMonth(activeStartDate)
      const monthEnd = endOfMonth(activeStartDate)
      const windowStartKey = formatDateKey(monthStart)
      const windowEndKey = formatDateKey(monthEnd)

      try {
        if (!supabaseClient) {
          const freeRange = buildFixedSlotsForRange(
            bookingConfig.durationMinutes,
            monthStart,
            monthEnd,
          )
          if (!ignore) {
            setSlotsByDate((current) => mergeSlots(current, freeRange))
          }
          return
        }

        const bookedRows = await loadBookedRequestsFromSupabase(supabaseClient, {
          bookingType: resolvedBookingType,
          windowStartKey,
          windowEndKey,
        })

        if (ignore) {
          return
        }

        const bookedSlotKeys = rowsToBookedSlotKeySet(bookedRows)
        const monthSlots = buildFixedSlotsForRange(
          bookingConfig.durationMinutes,
          monthStart,
          monthEnd,
          bookedSlotKeys,
        )
        setSlotsByDate((current) => mergeSlots(current, monthSlots))
      } catch {
        if (ignore) {
          return
        }

        const freeRange = buildFixedSlotsForRange(
          bookingConfig.durationMinutes,
          monthStart,
          monthEnd,
        )
        setSlotsByDate((current) => mergeSlots(current, freeRange))
      } finally {
        if (!ignore) {
          setLoadingSlots(false)
        }
      }
    }

    loadMonthSlots()

    return () => {
      ignore = true
    }
  }, [
    bookingConfig.durationMinutes,
    monthKey,
    resolvedBookingType,
    supabaseClient,
  ])

  const selectedDaySlots = slotsByDate[selectedDateKey] ?? []
  const selectedSlot =
    selectedDaySlots.find((slot) => slot.id === selectedSlotId && slot.status === 'available') ?? null

  function onDateSelect(nextDateValue) {
    const dateValue = Array.isArray(nextDateValue) ? nextDateValue[0] : nextDateValue
    const normalizedDate = new Date(dateValue)
    normalizedDate.setHours(0, 0, 0, 0)

    setSelectedDate(normalizedDate)
    setActiveStartDate(startOfMonth(normalizedDate))
    setSelectedSlotId('')
    setFormErrors((current) => ({ ...current, slot: undefined, submit: undefined }))
  }

  function onFieldChange(event) {
    const { name, value, type, checked } = event.target
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    const errors = {}
    const requiredFields = ['fullName', 'email', 'phoneNumber', 'meetingType']

    if (!selectedSlot) {
      errors.slot = 'Please select an available slot first.'
    }

    requiredFields.forEach((field) => {
      if (!formData[field].trim()) {
        errors[field] = 'Required'
      }
    })

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!formData.privacyAccepted) {
      errors.privacyAccepted = 'Please accept the data consent to continue.'
    }

    if (!supabaseClient) {
      errors.submit = 'Database connection unavailable. Please configure Supabase credentials.'
    }

    setFormErrors(errors)

    if (Object.keys(errors).length > 0 || !selectedSlot || !supabaseClient) {
      return
    }

    const referenceCode = `DUMMY-${String(requestCounter).padStart(6, '0')}`
    setIsSubmitting(true)

    try {
      await createBookingInSupabase(supabaseClient, {
        reference_code: referenceCode,
        booking_type: resolvedBookingType,
        slot_id: null,
        slot_date: selectedSlot.dateKey,
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
        full_name: formData.fullName,
        email: formData.email,
        phone: `${formData.countryCode} ${formData.phoneNumber.trim()}`,
        company: formData.company,
        meeting_type: formData.meetingType,
        notes: formData.notes,
        status: bookingConfig.approvalRequired ? 'pending' : 'confirmed',
      })

      setSlotsByDate((current) => applyBookedSlot(current, selectedSlot.dateKey, selectedSlot.id))
      setSubmittedBooking({
        reference: referenceCode,
        status: bookingConfig.approvalRequired ? 'Pending host approval' : 'Confirmed',
        slot: selectedSlot,
        attendeeName: formData.fullName,
        attendeeEmail: formData.email,
        meetingType: formData.meetingType,
      })
      setRequestCounter((current) => current + 1)
      setSelectedSlotId('')
      setFormData(initialFormData)
    } catch (error) {
      const errorMessage = error.message || 'Could not complete booking. Please retry.'
      if (errorMessage.toLowerCase().includes('already booked')) {
        setSlotsByDate((current) => applyBookedSlot(current, selectedSlot.dateKey, selectedSlot.id))
        setSelectedSlotId('')
      }
      setFormErrors((current) => ({
        ...current,
        submit: errorMessage,
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`app-shell ${embedded ? 'embedded' : ''}`}>
      <header className="hero-section">
        <div>
          <h1>{bookingConfig.title}</h1>
          <p className="hero-subtitle">
            {bookingConfig.durationMinutes} min sessions · {bookingConfig.location} · Timezone:{' '}
            {bookingConfig.timezone}
          </p>
        </div>
        <p className="helper-text">
          By default, each day has 6 fixed slots. A slot is booked only when booking data exists in
          the database.
        </p>
      </header>

      <main className="layout-grid">
        <section className="card">
          <h2>1. Pick date and time</h2>
          <p className="card-subtitle">
            Booked slots are disabled. Free slots can be selected.
          </p>

          <div className="calendar-shell">
            <Calendar
              className="booking-calendar"
              locale="en-GB"
              minDate={minSelectableDate}
              minDetail="month"
              maxDetail="month"
              onChange={onDateSelect}
              onActiveStartDateChange={({ activeStartDate: nextStartDate }) => {
                if (nextStartDate) {
                  setActiveStartDate(startOfMonth(nextStartDate))
                }
              }}
              value={selectedDate}
              tileClassName={({ date, view }) => {
                if (view !== 'month') {
                  return ''
                }
                const dateKey = formatDateKey(date)
                const status = getDateStatus(slotsByDate, dateKey)

                if (status.hasAvailable) {
                  return 'calendar-day-available'
                }
                if (status.isFull) {
                  return 'calendar-day-full'
                }
                return 'calendar-day-empty'
              }}
              tileContent={({ date, view }) => {
                if (view !== 'month') {
                  return null
                }
                const dateKey = formatDateKey(date)
                const status = getDateStatus(slotsByDate, dateKey)

                if (status.hasAvailable) {
                  return <span className="tile-status open">Open</span>
                }
                if (status.isFull) {
                  return <span className="tile-status full">Full</span>
                }
                return <span className="tile-status none">-</span>
              }}
            />

            <div className="calendar-legend">
              <span>
                <i className="dot available"></i> Available
              </span>
              <span>
                <i className="dot full"></i> Booked
              </span>
              <span>
                <i className="dot disabled"></i> No data yet
              </span>
            </div>

            <p className="calendar-selection">
              <strong>Selected date:</strong> {formatShortDateLabel(selectedDateKey)}
            </p>
          </div>

          {loadingSlots ? (
            <p className="loading-state">Loading availability...</p>
          ) : (
            <div className="slot-grid">
              {selectedDaySlots.map((slot) => {
                const isBooked = slot.status === 'booked'
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`slot-button ${selectedSlotId === slot.id ? 'active' : ''} ${
                      isBooked ? 'booked' : ''
                    }`}
                    disabled={isBooked}
                    onClick={() => setSelectedSlotId(slot.id)}
                  >
                    <span>
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <small>{isBooked ? 'Booked' : 'Free'}</small>
                  </button>
                )
              })}
            </div>
          )}

          {!loadingSlots && !selectedDaySlots.length ? (
            <p className="empty-state">No slot data for this month yet. Please navigate to another month.</p>
          ) : null}

          {formErrors.slot ? <p className="error-text">{formErrors.slot}</p> : null}
        </section>

        <section className="card">
          <h2>2. Booking form</h2>
          <form className="form-grid" onSubmit={onSubmit}>
            <label>
              Full name *
              <input
                name="fullName"
                value={formData.fullName}
                onChange={onFieldChange}
                placeholder="Max Mustermann"
              />
              {formErrors.fullName ? <span className="error-text">{formErrors.fullName}</span> : null}
            </label>

            <label>
              Email *
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={onFieldChange}
                placeholder="max@company.de"
              />
              {formErrors.email ? <span className="error-text">{formErrors.email}</span> : null}
            </label>

            <label>
              Phone *
              <div className="phone-input-group">
                <select
                  name="countryCode"
                  className="phone-country-code"
                  value={formData.countryCode}
                  onChange={onFieldChange}
                >
                  {countryCodeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  name="phoneNumber"
                  className="phone-number-input"
                  value={formData.phoneNumber}
                  onChange={onFieldChange}
                  placeholder="1701234567"
                />
              </div>
              {formErrors.phoneNumber ? (
                <span className="error-text">{formErrors.phoneNumber}</span>
              ) : null}
            </label>

            <label>
              Company (optional)
              <input
                name="company"
                value={formData.company}
                onChange={onFieldChange}
                placeholder="Example GmbH"
              />
            </label>

            <label>
              Meeting type *
              <select name="meetingType" value={formData.meetingType} onChange={onFieldChange}>
                <option value="">Select meeting type</option>
                {meetingTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {formErrors.meetingType ? <span className="error-text">{formErrors.meetingType}</span> : null}
            </label>

            <label>
              Notes (optional)
              <textarea
                name="notes"
                value={formData.notes}
                onChange={onFieldChange}
                rows={4}
                placeholder="Share your goals or expectations for the meeting"
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                name="privacyAccepted"
                checked={formData.privacyAccepted}
                onChange={onFieldChange}
              />
              <span>I agree to data processing for appointment scheduling.</span>
            </label>
            {formErrors.privacyAccepted ? (
              <span className="error-text">{formErrors.privacyAccepted}</span>
            ) : null}

            {formErrors.submit ? <p className="error-text">{formErrors.submit}</p> : null}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit booking request'}
            </button>
          </form>
        </section>
      </main>

      {submittedBooking ? (
        <div className="success-modal-backdrop" role="presentation">
          <div className="success-modal" role="dialog" aria-modal="true" aria-label="Booking success">
            <h2>Booking submitted successfully</h2>
            <p>Your booking has been saved to the database.</p>
            <p>
              <strong>Reference:</strong> {submittedBooking.reference}
            </p>
            <p>
              <strong>Attendee:</strong> {submittedBooking.attendeeName} ({submittedBooking.attendeeEmail})
            </p>
            <p>
              <strong>Meeting type:</strong> {submittedBooking.meetingType}
            </p>
            <p>
              <strong>Selected slot:</strong> {formatShortDateLabel(submittedBooking.slot.dateKey)} ·{' '}
              {submittedBooking.slot.startTime} - {submittedBooking.slot.endTime}
            </p>
            <p>
              {bookingConfig.approvalRequired
                ? 'A final confirmation will be sent after host approval.'
                : 'Your booking is confirmed.'}
            </p>
            <button type="button" className="primary-button" onClick={() => setSubmittedBooking(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
