import { useState } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { TopBar } from '../components/catalog/TopBar'
import { CatalogGameCard } from '../components/catalog/CatalogGameCard'
import { BottomBar } from '../components/catalog/BottomBar'
import { GAMES } from '../data/games'
import { useConfigStore } from '../store/configStore'

const NEW_SLUGS = new Set(GAMES.slice(0, 3).map((g) => g.slug))

export function CatalogPage() {
  const [search, setSearch] = useState('')
  const cfgGames = useConfigStore((s) => s.games)

  const enabledGames = GAMES.filter((g) => cfgGames[g.slug]?.enabled !== false)

  const filtered = enabledGames.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.genre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] overflow-hidden">
      <TopBar />

      {/* Logo / brand section */}
      <div className="flex flex-col items-center justify-center py-5 flex-shrink-0">
        <img
          src="/assets/brand/logo-horizontal.png"
          alt="VZLAUNCHER"
          className="h-10 object-contain"
        />
        <p className="text-[#333] text-[10px] mt-1.5 tracking-[0.3em] uppercase font-medium">
          Arcade Launcher
        </p>
      </div>

      {/* Section header + search */}
      <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
        <h2 className="text-[#444] text-[10px] font-bold uppercase tracking-[0.2em]">
          {search ? 'Search Results' : `${filtered.length} Games`}
        </h2>
        <div className="relative w-52">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]"
          />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-7 text-[#F5F5F5] placeholder-[#444] text-xs font-medium focus:outline-none focus:border-[#E5007E]/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#888] cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Card grid — fills all remaining space, no scroll */}
      <div className="flex-1 px-5 pb-3 min-h-0">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-6 grid-rows-2 h-full gap-3">
            {filtered.map((game) => (
              <CatalogGameCard
                key={game.id}
                game={game}
                isNew={NEW_SLUGS.has(game.slug)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#444] text-sm">No games found for "{search}"</p>
          </div>
        )}
      </div>

      <BottomBar gameCount={enabledGames.length} />
    </div>
  )
}
