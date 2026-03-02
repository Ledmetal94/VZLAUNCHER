import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FilePdf, BookOpen, CheckCircle } from '@phosphor-icons/react'
import { Layout } from '../components/layout/Layout'
import { GAMES } from '../data/games'
import { getTutorial } from '../data/tutorials'

type Tab = 'steps' | 'pdf'

export function TutorialPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const game = GAMES.find((g) => g.slug === slug)
  const tutorial = getTutorial(slug ?? '')
  const [tab, setTab] = useState<Tab>('steps')
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  if (!game || !tutorial) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-[#888888]">Tutorial not found.</p>
          <button onClick={() => navigate(-1)} className="text-[#E5007E] text-sm">Go back</button>
        </div>
      </Layout>
    )
  }

  const toggleStep = (i: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/game/${slug}`)}
          className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#888888] hover:text-[#F5F5F5] hover:border-white/[0.15] transition-all cursor-pointer flex-shrink-0"
        >
          <ArrowLeft size={20} weight="thin" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[#888888] text-xs font-medium uppercase tracking-widest">Tutorial</p>
          <h1 className="text-2xl font-black text-[#F5F5F5] truncate">{game.name}</h1>
        </div>
        <img
          src={game.logo}
          alt={game.name}
          className="h-10 object-contain object-right"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'steps' as Tab, label: 'Step-by-Step', icon: <BookOpen size={16} /> },
          { id: 'pdf' as Tab, label: 'PDF Manual', icon: <FilePdf size={16} /> },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              tab === id
                ? 'bg-[#E5007E] text-white'
                : 'bg-white/[0.04] border border-white/[0.08] text-[#888888] hover:text-[#F5F5F5]'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Steps tab */}
      {tab === 'steps' && (
        <div className="flex flex-col gap-3 max-w-2xl">
          <p className="text-[#888888] text-sm mb-2">
            {completedSteps.size} / {tutorial.steps.length} steps completed — tap a step to mark it done
          </p>
          {tutorial.steps.map((step, i) => {
            const done = completedSteps.has(i)
            return (
              <button
                key={i}
                onClick={() => toggleStep(i)}
                className={`w-full text-left flex gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                  done
                    ? 'bg-[#E5007E11] border-[#E5007E33]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5 transition-all ${
                  done ? 'bg-[#E5007E] text-white' : 'bg-white/[0.06] text-[#888888]'
                }`}>
                  {done ? <CheckCircle size={18} weight="fill" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold mb-1 transition-colors ${done ? 'text-[#E5007E]' : 'text-[#F5F5F5]'}`}>
                    {step.title}
                  </p>
                  <p className="text-[#888888] text-sm leading-relaxed">{step.body}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* PDF tab */}
      {tab === 'pdf' && (
        <div className="max-w-2xl">
          {tutorial.pdfUrl ? (
            <iframe
              src={tutorial.pdfUrl}
              className="w-full rounded-2xl border border-white/[0.08]"
              style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
              title={`${game.name} manual`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center bg-white/[0.02] rounded-2xl border border-white/[0.06]">
              <FilePdf size={48} weight="thin" color="#2A2A2A" />
              <p className="text-[#888888]">No PDF manual uploaded yet.</p>
              <p className="text-[#2A2A2A] text-sm">
                An admin can add the manual from the Admin → Tutorials page.
              </p>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
