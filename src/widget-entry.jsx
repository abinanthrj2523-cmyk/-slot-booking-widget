import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import appStyles from './App.css?inline'
import baseStyles from './index.css?inline'

function parseNumberAttribute(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function parseBooleanAttribute(value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return value.toLowerCase() === 'true'
}

class SlotBookingWidgetElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'booking-type',
      'title',
      'location',
      'timezone',
      'duration-minutes',
      'latest-availability-days',
      'approval-required',
    ]
  }

  connectedCallback() {
    if (this._root) {
      return
    }

    const shadowRoot = this.attachShadow({ mode: 'open' })

    const styleTag = document.createElement('style')
    styleTag.textContent = `
      :host {
        display: block;
        width: 100%;
      }
      ${baseStyles}
      ${appStyles}
    `

    this._mountPoint = document.createElement('div')
    shadowRoot.append(styleTag, this._mountPoint)

    this._root = createRoot(this._mountPoint)
    this.renderWidget()
  }

  attributeChangedCallback() {
    if (this._root) {
      this.renderWidget()
    }
  }

  disconnectedCallback() {
    if (this._root) {
      this._root.unmount()
      this._root = null
    }
  }

  renderWidget() {
    const configOverrides = {
      title: this.getAttribute('title') ?? undefined,
      location: this.getAttribute('location') ?? undefined,
      timezone: this.getAttribute('timezone') ?? undefined,
      durationMinutes: parseNumberAttribute(this.getAttribute('duration-minutes')),
      latestAvailabilityDays: parseNumberAttribute(
        this.getAttribute('latest-availability-days'),
      ),
      approvalRequired: parseBooleanAttribute(this.getAttribute('approval-required')),
    }

    Object.keys(configOverrides).forEach((key) => {
      if (configOverrides[key] === undefined) {
        delete configOverrides[key]
      }
    })

    this._root.render(
      <App
        embedded
        bookingType={this.getAttribute('booking-type') ?? 'default'}
        configOverrides={configOverrides}
      />,
    )
  }
}

if (!customElements.get('slot-booking-widget')) {
  customElements.define('slot-booking-widget', SlotBookingWidgetElement)
}
