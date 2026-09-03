'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin', label: 'Segnalazioni' },
  { href: '/admin/richieste', label: 'Richieste' },
  { href: '/admin/annunci', label: 'Annunci' },
  { href: '/admin/persone', label: 'Persone' },
  { href: '/admin/registro', label: 'Registro' },
] as const

/**
 * Le cinque pagine della moderazione. Il tab acceso lo decide l'indirizzo,
 * non uno stato: cosi' funziona anche arrivando da un link o dal tasto indietro.
 */
export function AdminTabs() {
  const pathname = usePathname()
  return (
    <nav className="admin-tabs" aria-label="Sezioni della moderazione">
      {TABS.map((tab) => {
        // "/admin" e' la radice di tutte le altre: acceso solo se e' esattamente lui.
        const active = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`chip${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
