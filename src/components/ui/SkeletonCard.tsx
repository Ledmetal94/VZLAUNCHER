export function SkeletonCard() {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#141414] animate-pulse" style={{ aspectRatio: '2/3' }}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent animate-[shimmer_1.5s_infinite]" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="h-4 bg-[#2A2A2A] rounded w-3/4 mb-2" />
        <div className="h-3 bg-[#2A2A2A] rounded w-1/2" />
      </div>
    </div>
  )
}
