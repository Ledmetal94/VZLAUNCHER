import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'
import { GAMES } from '../data/games'
import { useConfigStore } from '../store/configStore'

const LAUNCHERS = ['herozone', 'vexplay'] as const

export function AdminConfigPage() {
  const { games, updateGame, resetGame, resetAll } = useConfigStore()

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[#888888] text-sm font-medium uppercase tracking-widest">Admin</p>
          <h1 className="text-3xl font-black text-[#F5F5F5]">
            Game <span className="text-[#E5007E]">Config</span>
          </h1>
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#888888] text-sm hover:text-[#F5F5F5] hover:border-white/[0.15] transition-all cursor-pointer"
        >
          <ArrowCounterClockwise size={16} />
          Reset all to defaults
        </button>
      </div>

      <div className="flex flex-col gap-3 max-w-3xl">
        {GAMES.map((game) => {
          const cfg = games[game.slug] ?? { price: game.price, launcher: game.launcher, enabled: true }
          return (
            <div
              key={game.slug}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
            >
              {/* Poster */}
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#141414]">
                <img src={game.poster} alt={game.name} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-[#F5F5F5] font-semibold truncate">{game.name}</p>
                <p className="text-[#888888] text-xs">{game.genre}</p>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[#888888] text-xs">Enabled</span>
                <button
                  onClick={() => updateGame(game.slug, { enabled: !cfg.enabled })}
                  className={`w-10 h-6 rounded-full transition-all cursor-pointer relative ${
                    cfg.enabled ? 'bg-[#E5007E]' : 'bg-[#2A2A2A]'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    cfg.enabled ? 'left-5' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Launcher */}
              <div className="flex items-center gap-2">
                <span className="text-[#888888] text-xs">Launcher</span>
                <select
                  value={cfg.launcher}
                  onChange={(e) => updateGame(game.slug, { launcher: e.target.value as typeof LAUNCHERS[number] })}
                  className="bg-[#141414] border border-[#2A2A2A] text-[#F5F5F5] text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#E5007E] cursor-pointer"
                >
                  {LAUNCHERS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-[#888888] text-xs">Price €</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={cfg.price}
                  onChange={(e) => updateGame(game.slug, { price: Number(e.target.value) })}
                  className="w-20 bg-[#141414] border border-[#2A2A2A] text-[#F5F5F5] text-sm rounded-lg px-3 py-1.5 text-center focus:outline-none focus:border-[#E5007E]"
                />
              </div>

              {/* Reset */}
              <button
                onClick={() => resetGame(game.slug)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888888] hover:text-[#F5F5F5] hover:bg-white/[0.06] transition-all cursor-pointer flex-shrink-0"
                title="Reset to default"
              >
                <ArrowCounterClockwise size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
