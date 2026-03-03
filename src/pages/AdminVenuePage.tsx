import { useState, useEffect } from 'react'
import { FloppyDisk, Check } from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'

export interface VenueSettings {
  venueName: string
  currency: string
  defaultPrice: number
  timezone: string
}

const STORAGE_KEY = 'vz-venue-settings'

const DEFAULTS: VenueSettings = {
  venueName: '',
  currency: '€',
  defaultPrice: 10,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

export function loadVenueSettings(): VenueSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

function saveVenueSettings(s: VenueSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

const TIMEZONES = [
  'Europe/Rome', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Europe/Madrid', 'Europe/Amsterdam', 'America/New_York', 'America/Chicago',
  'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Dubai', 'Australia/Sydney',
]

export function AdminVenuePage() {
  const [settings, setSettings] = useState<VenueSettings>(loadVenueSettings)
  const [saved, setSaved] = useState(false)

  // If auth store has venueName, pre-fill if empty
  useEffect(() => {
    const current = loadVenueSettings()
    if (!current.venueName) {
      try {
        const auth = JSON.parse(localStorage.getItem('vz-auth') ?? '{}')
        const venueName = auth?.state?.venueName ?? ''
        if (venueName) setSettings((s) => ({ ...s, venueName }))
      } catch { /* ignore */ }
    }
  }, [])

  function handleSave() {
    saveVenueSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const field = (
    label: string,
    value: string | number,
    onChange: (v: string) => void,
    opts?: { type?: string; placeholder?: string; hint?: string }
  ) => (
    <div>
      <label className="text-[#555] text-xs mb-1.5 block font-medium">{label}</label>
      <input
        type={opts?.type ?? 'text'}
        placeholder={opts?.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-[#F5F5F5] placeholder-[#333] focus:outline-none focus:border-[#E5007E] transition-colors"
      />
      {opts?.hint && <p className="text-[#444] text-xs mt-1">{opts.hint}</p>}
    </div>
  )

  return (
    <Layout>
      <div className="max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#F5F5F5]">
              Venue <span className="text-[#E5007E]">Settings</span>
            </h1>
            <p className="text-[#888] text-sm mt-1">Configure your venue details and defaults</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Venue identity */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
            <p className="text-[#888] text-xs font-semibold uppercase tracking-wider">Venue Identity</p>
            {field('Venue Name', settings.venueName,
              (v) => setSettings((s) => ({ ...s, venueName: v })),
              { placeholder: 'Virtual Zone Roma', hint: 'Shown in the PDF analytics report header' }
            )}
          </div>

          {/* Session defaults */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
            <p className="text-[#888] text-xs font-semibold uppercase tracking-wider">Session Defaults</p>
            <div className="grid grid-cols-2 gap-4">
              {field('Currency Symbol', settings.currency,
                (v) => setSettings((s) => ({ ...s, currency: v })),
                { placeholder: '€', hint: 'Used across sessions and analytics' }
              )}
              {field('Default Session Price', settings.defaultPrice,
                (v) => setSettings((s) => ({ ...s, defaultPrice: Number(v) || 0 })),
                { type: 'number', placeholder: '10', hint: 'Fallback if game has no price set' }
              )}
            </div>
          </div>

          {/* Regional */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
            <p className="text-[#888] text-xs font-semibold uppercase tracking-wider">Regional</p>
            <div>
              <label className="text-[#555] text-xs mb-1.5 block font-medium">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
                className="w-full bg-[#141414] border border-[#2A2A2A] text-[#888] text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#E5007E] cursor-pointer transition-colors"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <p className="text-[#444] text-xs mt-1">Used for date grouping in analytics charts</p>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              saved
                ? 'bg-[#00E67622] border border-[#00E67633] text-[#00E676]'
                : 'bg-[#E5007E] text-white hover:bg-[#CC006F]'
            }`}
          >
            {saved ? <><Check size={16} weight="bold" />Saved!</> : <><FloppyDisk size={16} weight="bold" />Save Settings</>}
          </button>
        </div>
      </div>
    </Layout>
  )
}
