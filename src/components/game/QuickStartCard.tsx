import { X, Target, GameController, Lightbulb } from '@phosphor-icons/react'
import type { GameTutorial } from '../../data/tutorials'

interface QuickStartCardProps {
  tutorial: GameTutorial
  gameName: string
  onClose: () => void
}

export function QuickStartCard({ tutorial, gameName, onClose }: QuickStartCardProps) {
  const { quickstart } = tutorial

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <p className="text-[#888888] text-xs font-medium uppercase tracking-widest">Quick Start</p>
            <h2 className="text-[#F5F5F5] font-bold text-lg">{gameName}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#888888] hover:bg-white/[0.06] hover:text-[#F5F5F5] transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* Objective */}
          <div className="flex gap-3">
            <Target size={20} weight="fill" color="#E5007E" className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-1">Objective</p>
              <p className="text-[#F5F5F5] text-sm leading-relaxed">{quickstart.objective}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <GameController size={20} weight="fill" color="#E5007E" className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">Controls</p>
              <ul className="flex flex-col gap-1.5">
                {quickstart.controls.map((c, i) => {
                  const [action, ...rest] = c.split(':')
                  return (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-[#E5007E] font-semibold flex-shrink-0">{action}:</span>
                      <span className="text-[#888888]">{rest.join(':').trim()}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Tips */}
          <div className="flex gap-3">
            <Lightbulb size={20} weight="fill" color="#E5007E" className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">Tips</p>
              <ul className="flex flex-col gap-1.5">
                {quickstart.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#888888]">
                    <span className="text-[#E5007E] flex-shrink-0">·</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
