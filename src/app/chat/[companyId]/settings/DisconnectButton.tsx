'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DisconnectButton({ provider }: { provider: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDisconnect() {
    if (!confirm('連携を解除しますか？')) return
    setLoading(true)
    await fetch('/api/integrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
    >
      {loading ? '解除中...' : '連携解除'}
    </button>
  )
}
