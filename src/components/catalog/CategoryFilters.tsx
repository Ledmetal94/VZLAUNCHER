import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/data/games'
import type { Category } from '@/types/models'

interface CategoryFiltersProps {
  selected: Category | 'all'
  onSelect: (category: Category | 'all') => void
  gameCount: number
}

export default function CategoryFilters({ selected, onSelect, gameCount }: CategoryFiltersProps) {
  return (
    <div
      className="flex shrink-0 items-center overflow-x-auto scrollbar-none px-6 xl:px-8"
      style={{
        height: 48,
        gap: 6,
        borderBottom: '1px solid rgba(123,100,169,0.06)',
        touchAction: 'pan-x',
      }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id as Category | 'all')}
            className={cn(
              'shrink-0 min-h-[44px] px-4 xl:px-5 rounded-lg text-xs xl:text-sm font-semibold tracking-wide transition-colors active:scale-95',
              isActive
                ? 'text-white'
                : 'text-white/30 hover:text-white/55'
            )}
            style={{
              border: isActive ? '1px solid #7B64A9' : '1px solid transparent',
              background: isActive ? 'rgba(82,49,137,0.28)' : 'transparent',
              letterSpacing: '.03em',
            }}
          >
            {cat.label}
          </button>
        )
      })}
      <span
        className="ml-auto shrink-0 text-[11px] font-medium text-white/15 pl-2"
      >
        {gameCount} giochi
      </span>
    </div>
  )
}
