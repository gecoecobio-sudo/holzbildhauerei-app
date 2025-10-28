"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Lock, LogOut } from "lucide-react"

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check')
      const data = await res.json()
      setIsAuthenticated(data.authenticated)
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (data.success) {
        setIsAuthenticated(true)
        setPassword("")
      } else {
        setError(data.error || 'Login fehlgeschlagen')
      }
    } catch (error) {
      setError('Verbindungsfehler')
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setIsAuthenticated(false)
      router.push('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-secondary">Lädt...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--hover))]">
        <div className="notion-card w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[rgb(var(--accent-teal))] rounded-lg flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Admin Login</h1>
            <p className="text-secondary text-sm">
              Melde dich an, um Quellen zu verwalten
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="notion-input"
                placeholder="Passwort eingeben..."
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="notion-button-primary w-full"
            >
              Anmelden
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="notion-button-secondary w-full"
            >
              Zurück zur Startseite
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[rgb(var(--border))] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[rgb(var(--accent-teal))] rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-secondary hover:text-[rgb(var(--foreground))] transition-colors"
            >
              Zur Startseite
            </button>
            <button
              onClick={handleLogout}
              className="notion-button-secondary flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Abmelden
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="notion-card">
            <h2 className="text-lg font-semibold mb-4">Query Management</h2>
            <p className="text-secondary text-sm mb-4">
              Erstelle und verwalte Suchanfragen für die automatische Quellensuche.
            </p>
            <button
              onClick={() => router.push('/admin/queries')}
              className="notion-button-primary"
            >
              Queries verwalten
            </button>
          </div>

          <div className="notion-card">
            <h2 className="text-lg font-semibold mb-4">Tag-Analyse</h2>
            <p className="text-secondary text-sm mb-4">
              Analysiere Tags, ihre Häufigkeit und Co-Occurrence-Muster.
            </p>
            <button
              onClick={() => router.push('/admin/tags')}
              className="notion-button-primary"
            >
              Tags analysieren
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
