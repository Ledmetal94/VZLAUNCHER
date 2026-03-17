import { useState, useRef, useEffect } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
}

export default function LazyImage({ src, alt, className, style }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [inView, setInView] = useState(false)

  // Timeout: show error if image doesn't load in 8s
  useEffect(() => {
    if (!inView || loaded || error) return
    const timer = setTimeout(() => setError(true), 8000)
    return () => clearTimeout(timer)
  }, [inView, loaded, error])

  useEffect(() => {
    const el = imgRef.current
    if (!el) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observerRef.current?.disconnect()
        }
      },
      { rootMargin: '100px' },
    )

    observerRef.current.observe(el)
    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <div
      ref={imgRef}
      className={className}
      style={{
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {/* Placeholder */}
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(82,49,137,0.15), rgba(13,12,26,0.8))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {error ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          ) : (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.08)',
                borderTopColor: 'rgba(230,0,126,0.4)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          )}
        </div>
      )}

      {/* Actual image */}
      {inView && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
    </div>
  )
}
