'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Header nav link with the brand underline (`.nav-link`): a vermilion rule wipes
 * out from the center on hover and stays for the active route. Active is matched
 * on the current pathname (exact, or a section prefix like /browse/*).
 */
export function NavLink({
  href,
  children,
  className = '',
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
      href={href}
      data-active={active}
      aria-current={active ? 'page' : undefined}
      className={`nav-link ${className} ${active ? 'text-shelf-text-primary' : ''}`}
    >
      {children}
    </Link>
  )
}
