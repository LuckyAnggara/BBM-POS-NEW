'use client'

import React, { ReactNode } from 'react'
import Link from 'next/link'
import { useShiftAwareNavigation } from '@/hooks/useShiftAwareNavigation'

interface SafeLinkProps {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
  replace?: boolean
}

/**
 * SafeLink component yang menggantikan Next.js Link
 * untuk navigasi yang aman dengan shift warning
 */
export function SafeLink({
  href,
  children,
  className,
  onClick,
  replace = false,
  ...props
}: SafeLinkProps) {
  const { push, replace: routerReplace } = useShiftAwareNavigation()

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    if (onClick) {
      onClick()
    }

    if (replace) {
      await routerReplace(href)
    } else {
      await push(href)
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}
