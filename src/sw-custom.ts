/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

// Background Sync for session queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sessions') {
    event.waitUntil(syncPendingSessions())
  }
})

async function syncPendingSessions() {
  try {
    // Notify any open app windows to sync their pending sessions
    const bc = new BroadcastChannel('vz-sync')
    bc.postMessage({ type: 'SYNC_SESSIONS_REQUESTED' })
    bc.close()
  } catch {
    // BroadcastChannel not available or no listeners — sync will retry on next app open
  }
}

// Listen for skip-waiting messages
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
