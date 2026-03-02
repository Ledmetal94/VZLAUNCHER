import { useState } from 'react'
import { FilePdf, FloppyDisk, X } from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'
import { GAMES } from '../data/games'
import { TUTORIALS, type GameTutorial } from '../data/tutorials'
import { useConfigStore } from '../store/configStore'

// Per-game PDF URL overrides stored in config
interface TutorialOverrides {
  pdfUrls: Record<string, string>
}

function useTutorialOverrides() {
  const key = 'vz-tutorial-overrides'
  const raw = localStorage.getItem(key)
  const initial: TutorialOverrides = raw ? JSON.parse(raw) : { pdfUrls: {} }

  const [overrides, setOverrides] = useState<TutorialOverrides>(initial)

  const setPdfUrl = (slug: string, url: string) => {
    const next = { ...overrides, pdfUrls: { ...overrides.pdfUrls, [slug]: url } }
    setOverrides(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  const clearPdfUrl = (slug: string) => {
    const next = { ...overrides.pdfUrls }
    delete next[slug]
    const updated = { ...overrides, pdfUrls: next }
    setOverrides(updated)
    localStorage.setItem(key, JSON.stringify(updated))
  }

  return { overrides, setPdfUrl, clearPdfUrl }
}

export function AdminTutorialsPage() {
  const { games } = useConfigStore()
  const { overrides, setPdfUrl, clearPdfUrl } = useTutorialOverrides()
  const [editing, setEditing] = useState<string | null>(null)
  const [draftUrl, setDraftUrl] = useState('')

  const tutorialMap = Object.fromEntries(TUTORIALS.map((t) => [t.slug, t]))

  const startEdit = (slug: string) => {
    setEditing(slug)
    setDraftUrl(overrides.pdfUrls[slug] ?? tutorialMap[slug]?.pdfUrl ?? '')
  }

  const save = (slug: string) => {
    if (draftUrl.trim()) {
      setPdfUrl(slug, draftUrl.trim())
    } else {
      clearPdfUrl(slug)
    }
    setEditing(null)
  }

  return (
    <Layout>
      <div className="mb-6">
        <p className="text-[#888888] text-sm font-medium uppercase tracking-widest">Admin</p>
        <h1 className="text-3xl font-black text-[#F5F5F5]">
          Tutorial <span className="text-[#E5007E]">Content</span>
        </h1>
        <p className="text-[#888888] text-sm mt-1">
          Set PDF manual URLs per game. Changes take effect immediately without redeployment.
        </p>
      </div>

      <div className="flex flex-col gap-3 max-w-3xl">
        {GAMES.map((game) => {
          const cfg = games[game.slug]
          if (cfg && !cfg.enabled) return null
          const tutorial = tutorialMap[game.slug] as GameTutorial | undefined
          const pdfUrl = overrides.pdfUrls[game.slug] ?? tutorial?.pdfUrl
          const isEditing = editing === game.slug
          const stepsCount = tutorial?.steps.length ?? 0

          return (
            <div key={game.slug} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#141414]">
                  <img src={game.poster} alt={game.name} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#F5F5F5] font-semibold">{game.name}</p>
                  <p className="text-[#888888] text-xs">{stepsCount} tutorial steps</p>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  pdfUrl
                    ? 'bg-[#E5007E11] border border-[#E5007E33] text-[#E5007E]'
                    : 'bg-white/[0.04] border border-white/[0.06] text-[#888888]'
                }`}>
                  {pdfUrl ? 'PDF set' : 'No PDF'}
                </div>
              </div>

              {/* PDF URL editor */}
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    placeholder="https://... or /assets/manuals/game.pdf"
                    className="flex-1 h-10 bg-[#141414] border border-[#2A2A2A] focus:border-[#E5007E] text-[#F5F5F5] text-sm rounded-xl px-4 focus:outline-none placeholder-[#444]"
                    autoFocus
                  />
                  <button
                    onClick={() => save(game.slug)}
                    className="w-10 h-10 rounded-xl bg-[#E5007E] flex items-center justify-center text-white hover:bg-[#FF1A95] transition-all cursor-pointer flex-shrink-0"
                  >
                    <FloppyDisk size={18} weight="fill" />
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#888888] hover:text-[#F5F5F5] transition-all cursor-pointer flex-shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(game.slug)}
                  className="flex items-center gap-2 text-sm text-[#888888] hover:text-[#E5007E] transition-colors cursor-pointer"
                >
                  <FilePdf size={16} />
                  {pdfUrl ? (
                    <span className="truncate max-w-xs">{pdfUrl}</span>
                  ) : (
                    <span>Click to add PDF URL</span>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
