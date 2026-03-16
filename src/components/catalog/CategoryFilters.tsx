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
    <div className="flex shrink-0 items-center justify-between px-6 py-2">
      <div className="flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id as Category | 'all')}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium transition',
              selected === cat.id
                ? 'bg-primary text-white'
                : 'bg-surface-light text-muted hover:bg-surface-lighter hover:text-white',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted">{gameCount} games</span>
    </div>
  )
}
