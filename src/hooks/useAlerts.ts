import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useTokenStore } from '@/store/tokenStore'
import { useConnectionStore } from '@/store/connectionStore'

const LOW_TOKEN_THRESHOLD = 10

export function useAlerts() {
  const balance = useTokenStore((s) => s.balance)
  const cloudStatus = useConnectionStore((s) => s.cloudStatus)
  const prevBalance = useRef(balance)
  const prevCloud = useRef(cloudStatus)
  const lastCloudToast = useRef(0)

  // Low token warning
  useEffect(() => {
    const prev = prevBalance.current
    prevBalance.current = balance

    // Crossed threshold downward
    if (balance <= LOW_TOKEN_THRESHOLD && balance > 0 && prev > LOW_TOKEN_THRESHOLD) {
      toast.warning(`Gettoni in esaurimento: ${balance} rimasti`, { duration: 6000 })
    }

    // Hit zero
    if (balance === 0 && prev > 0) {
      toast.error('Gettoni esauriti!', { duration: 8000 })
    }
  }, [balance])

  // Reconnection notification (debounced — min 5s between toasts)
  useEffect(() => {
    const prev = prevCloud.current
    prevCloud.current = cloudStatus
    const now = Date.now()

    if (now - lastCloudToast.current < 5000) return

    if (prev === 'offline' && cloudStatus === 'online') {
      toast.success('Connessione ripristinata', { duration: 3000 })
      lastCloudToast.current = now
    }
    if (prev === 'online' && cloudStatus === 'offline') {
      toast.warning('Connessione al cloud persa', { duration: 5000 })
      lastCloudToast.current = now
    }
  }, [cloudStatus])
}
