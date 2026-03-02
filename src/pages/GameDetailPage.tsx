import { useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, GameController, Users, Tag, Lightning, Warning, BookOpen, Lightning as BoltIcon } from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { QuickStartCard } from '../components/game/QuickStartCard'
import { GAMES } from '../data/games'
import { getTutorial } from '../data/tutorials'
import { useConfigStore } from '../store/configStore'

export function GameDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const game = GAMES.find((g) => g.slug === slug)
  const tutorial = getTutorial(slug ?? '')
  const cfg = useConfigStore((s) => s.games[slug ?? ''])

  const [confirming, setConfirming] = useState(false)
  const [showQuickStart, setShowQuickStart] = useState(false)

  const price = cfg?.price ?? game?.price ?? 0

  if (!game) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-[#888888]">Game not found.</p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/catalog')}>Back to Catalog</Button>
        </div>
      </Layout>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A]">
      {/* Hero */}
      <div className="relative h-[55vh] min-h-[320px]">
        {game.video ? (
          <video src={game.video} autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover" poster={game.poster} />
        ) : (
          <img src={game.poster} alt={game.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#0A0A0A]" />

        <button onClick={() => navigate('/catalog')}
          className="absolute top-6 left-6 w-11 h-11 rounded-xl bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-[#E5007E] transition-colors cursor-pointer">
          <ArrowLeft size={22} weight="thin" />
        </button>

        <div className="absolute bottom-6 left-6">
          <img src={game.logo} alt={`${game.name} logo`} className="h-12 object-contain object-left mb-3"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <h1 className="text-4xl font-black text-white leading-tight">{game.name}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-6 pb-10 max-w-[1280px] mx-auto w-full">
        {/* Metadata chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Chip icon={<GameController size={16} weight="thin" />} label={game.genre} />
          <Chip icon={<Users size={16} weight="thin" />} label={game.players} />
          <Chip icon={<Lightning size={16} weight="thin" />} label={cfg?.launcher ?? game.launcher} />
          <Chip icon={<Tag size={16} weight="thin" />} label={`€${price} / session`} accent />
        </div>

        {/* Description */}
        <p className="text-[#888888] text-base leading-relaxed mb-6">{game.description}</p>

        {/* Tutorial actions */}
        {tutorial && (
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setShowQuickStart(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#888888] text-sm font-medium hover:border-[#E5007E] hover:text-[#E5007E] transition-all cursor-pointer"
            >
              <BoltIcon size={16} weight="fill" />
              Quick Start
            </button>
            <button
              onClick={() => navigate(`/tutorial/${game.slug}`)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#888888] text-sm font-medium hover:border-[#E5007E] hover:text-[#E5007E] transition-all cursor-pointer"
            >
              <BookOpen size={16} weight="regular" />
              Full Tutorial
            </button>
          </div>
        )}

        {/* CTA */}
        {!confirming ? (
          <Button fullWidth size="lg" onClick={() => setConfirming(true)}>
            <GameController size={24} weight="fill" className="mr-3" />
            Start Session
          </Button>
        ) : (
          <div className="w-full bg-white/[0.04] backdrop-blur-md border border-[#E5007E44] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <Warning size={22} weight="fill" color="#E6007E" />
              <p className="text-[#F5F5F5] font-semibold">Confirm session start</p>
            </div>
            <p className="text-[#888888] text-sm mb-1">
              Game: <span className="text-[#F5F5F5] font-medium">{game.name}</span>
            </p>
            <p className="text-[#888888] text-sm mb-5">
              Price: <span className="text-[#E6007E] font-semibold">€{price} / session</span>
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setConfirming(false)}>Cancel</Button>
              <Button fullWidth onClick={() => navigate(`/launch/${game.slug}`)}>
                <GameController size={18} weight="fill" className="mr-2" />
                Confirm & Launch
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Start modal */}
      {showQuickStart && tutorial && (
        <QuickStartCard tutorial={tutorial} gameName={game.name} onClose={() => setShowQuickStart(false)} />
      )}
    </div>
  )
}

function Chip({ icon, label, accent = false }: { icon: ReactNode; label: string; accent?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
      accent ? 'border-[#E5007E] text-[#E5007E] bg-[#E5007E11]' : 'border-[#2A2A2A] text-[#888888] bg-[#141414]'
    }`}>
      {icon}{label}
    </span>
  )
}
