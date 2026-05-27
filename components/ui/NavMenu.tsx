'use client'

import { usePathname } from 'next/navigation'

const menus = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/company-info', label: '회사소개' },
  { href: '/terms', label: '이용약관' },
  { href: '/announcements', label: '공지사항' },
  { href: '/banners', label: '배너 관리' },
  { href: '/programs', label: '프로그램 관리' },
  { href: '/institutions', label: '학교' },
  { href: '/mentors', label: '강사' },
  { href: '/occupations', label: '직업' },
]

export function NavMenu() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-3">
      <p className="text-xs font-medium text-gray-400 px-2 mb-2">메뉴</p>
      {menus.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <a
            key={href}
            href={href}
            className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors ${
              isActive
                ? 'bg-gray-900 text-white font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </a>
        )
      })}
    </nav>
  )
}
