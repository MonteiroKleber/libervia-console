'use client'

import { useEffect, useState } from 'react'

type HealthStatus = {
  status: string
  service: string
} | null

export default function Home() {
  const [health, setHealth] = useState<HealthStatus>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_CONSOLE_API_BASE_URL || 'http://localhost:8000'

    fetch(`${apiUrl}/health`)
      .then(res => res.json())
      .then(data => {
        setHealth(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Libervia Console</h1>

      <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Console API Status</h2>
        {loading && <p>Checking API status...</p>}
        {error && (
          <p style={{ color: 'red' }}>
            Error: {error}
          </p>
        )}
        {health && (
          <div>
            <p><strong>Status:</strong> {health.status}</p>
            <p><strong>Service:</strong> {health.service}</p>
          </div>
        )}
      </div>
    </main>
  )
}
