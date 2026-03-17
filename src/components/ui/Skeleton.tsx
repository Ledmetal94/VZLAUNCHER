export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: 8,
        ...style,
      }}
    />
  )
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(123,100,169,0.06)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px' }}>
          <Skeleton style={{ height: 14, width: `${60 + Math.random() * 30}%`, borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(22,20,45,0.4)',
      border: '1px solid rgba(123,100,169,0.08)',
      borderRadius: 12,
      overflow: 'hidden',
      width: '100%',
      height: '100%',
    }}>
      <Skeleton style={{ width: '100%', height: '65%', borderRadius: 0 }} />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton style={{ height: 14, width: '70%', borderRadius: 4 }} />
        <Skeleton style={{ height: 10, width: '40%', borderRadius: 4 }} />
      </div>
    </div>
  )
}
