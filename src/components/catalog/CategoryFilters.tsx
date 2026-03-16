import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/data/games'
import type { Category } from '@/types/models'

interface CategoryFiltersProps {
  selected: Category | 'all'
  onSelect: (category: Category | 'all') => void
  gameCount: number
}

export default function CategoryFilters({
  selected,
  onSelect,
  gameCount,
}: CategoryFiltersProps) {
  return (
    <div
      className="flex shrink-0 items-center"
      style={{
        height: 44,
        gap: 5,
        padding: '0 32px',
        borderBottom: '1px solid rgba(123,100,169,0.06)',
      }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id as Category | 'all')}
            className={cn('transition-colors')}
            style={{
              padding: '7px 22px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '.03em',
              border: isActive ? '1px solid #7B64A9' : '1px solid transparent',
              background: isActive ? 'rgba(82,49,137,0.28)' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.28)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'rgba(255,255,255,0.28)'
              }
            }}
          >
            {cat.label}
          </button>
        )
      })}
      <span
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.15)',
          fontWeight: 500,
          marginLeft: 'auto',
        }}
      >
        {gameCount} giochi
      </span>
    </div>
  )
}
