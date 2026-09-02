'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/bacheca', icon: '🏠', label: 'Bacheca' },
  { href: '/vicino', icon: '📍', label: 'Vicino a me' },
  { href: '/nuovo', icon: '➕', label: 'Pubblica' },
  { href: '/notifiche', icon: '🔔', label: 'Avvisi' },
]

export function TabBar({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname()
  const items = loggedIn
    ? [...tabs, { href: '/profilo', icon: '👤', label: 'Profilo' }]
    : [...tabs, { href: '/accedi', icon: '👤', label: 'Accedi' }]

  return (
    <nav className="tabbar">
      {items.map((tab) => (
        <Link key={tab.href} href={tab.href} className={pathname === tab.href ? 'active' : ''}>
          <span className="ic" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  )
}
