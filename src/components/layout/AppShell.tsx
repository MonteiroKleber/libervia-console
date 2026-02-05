'use client'

import { useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Nav, Icons } from './Nav'

interface AppShellProps {
  children: ReactNode
  institutionName?: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { href: '/chat', label: 'Chat', icon: Icons.chat },
  { href: '/jobs', label: 'Jobs', icon: Icons.jobs },
  { href: '/approvals', label: 'Aprovacoes', icon: Icons.approvals },
  { href: '/audit', label: 'Auditoria', icon: Icons.audit },
]

export function AppShell({ children, institutionName }: AppShellProps) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout failed:', err)
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Skip link - first focusable element */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Pular para o conteúdo principal
      </a>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          aria-label="Abrir menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {Icons.menu}
        </button>
        <Link href="/dashboard" className="font-semibold text-slate-900">
          {institutionName || 'Bazari Console'}
        </Link>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        id="mobile-menu"
        className={`
          lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Menu de navegação"
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
          <span className="font-semibold text-slate-900">
            {institutionName || 'Bazari Console'}
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            aria-label="Fechar menu"
          >
            {Icons.close}
          </button>
        </div>
        <div className="p-4 flex-1">
          <Nav items={navItems} />
        </div>
        <div className="p-4 border-t border-slate-200 space-y-1">
          <Link
            href="/institutions"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <span className="text-slate-500">{Icons.institutions}</span>
            <span>Instituicoes</span>
          </Link>
          <Link
            href="/account"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <span className="text-slate-500">{Icons.account}</span>
            <span>Conta</span>
          </Link>
          <Link
            href="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <span className="text-slate-500">{Icons.settings}</span>
            <span>Configuracoes</span>
          </Link>
          <button
            onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <span className="text-slate-500">{Icons.logout}</span>
            <span>{loggingOut ? 'Saindo...' : 'Sair'}</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex fixed top-0 left-0 bottom-0 flex-col
          bg-white border-r border-slate-200 z-30
          transition-all duration-200 ease-in-out
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
        `}
        aria-label="Barra lateral de navegação"
      >
        {/* Logo/Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="font-semibold text-slate-900 truncate">
              {institutionName || 'Bazari Console'}
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg
              transition-colors
              ${sidebarCollapsed ? 'mx-auto' : ''}
            `}
            aria-label={sidebarCollapsed ? 'Expandir menu' : 'Colapsar menu'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? Icons.chevronRight : Icons.chevronLeft}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <Nav items={navItems} collapsed={sidebarCollapsed} />
        </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 space-y-1">
          <Link
            href="/institutions"
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg
              text-slate-600 hover:text-slate-900 hover:bg-slate-100
              transition-colors
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="Instituicoes"
          >
            <span className="text-slate-500">{Icons.institutions}</span>
            {!sidebarCollapsed && <span>Instituicoes</span>}
          </Link>
          <Link
            href="/account"
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg
              text-slate-600 hover:text-slate-900 hover:bg-slate-100
              transition-colors
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="Conta"
          >
            <span className="text-slate-500">{Icons.account}</span>
            {!sidebarCollapsed && <span>Conta</span>}
          </Link>
          <Link
            href="/settings"
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg
              text-slate-600 hover:text-slate-900 hover:bg-slate-100
              transition-colors
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="Configuracoes"
          >
            <span className="text-slate-500">{Icons.settings}</span>
            {!sidebarCollapsed && <span>Configuracoes</span>}
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg
              text-slate-600 hover:text-red-700 hover:bg-red-50
              transition-colors disabled:opacity-50
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title="Sair"
          >
            <span className="text-slate-500">{Icons.logout}</span>
            {!sidebarCollapsed && <span>{loggingOut ? 'Saindo...' : 'Sair'}</span>}
          </button>
      </div>
    </aside>

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        className={`
          min-h-screen pt-16 lg:pt-0
          transition-all duration-200 ease-in-out
          ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}
        `}
      >
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
