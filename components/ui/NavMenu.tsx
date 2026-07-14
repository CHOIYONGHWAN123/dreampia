'use client'

import { usePathname } from 'next/navigation'

type MenuItem =
  | { href: string; label: string; children?: undefined }
  | { href?: undefined; label: string; children: { href: string; label: string }[] }

const menus: MenuItem[] = [
  { href: '/dashboard', label: '대시보드' },
  {
    label: '나의 할일',
    children: [{ href: '/my-tasks/recruiting', label: '강사 섭외' }],
  },
  { href: '/counter', label: '카운터 관리' },
  { href: '/company-info', label: '회사소개' },
  { href: '/terms', label: '이용약관' },
  { href: '/announcements', label: '공지사항' },
  { href: '/banners', label: '배너' },
  { href: '/campaigns', label: '행사명' },
  { href: '/institutions', label: '기관' },
  { href: '/mentors', label: '강사' },
  { href: '/programs', label: '프로그램' },
  { href: '/supplies', label: '준비물 관리' },
  { href: '/event-operations', label: '행사운영확인표' },
]

function isMenuActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function NavMenu() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-3">
      <p className="text-xs font-medium text-gray-400 px-2 mb-2">메뉴</p>
      {menus.map((menu) => {
        if (menu.children) {
          return (
            <div key={menu.label} className="mb-1">
              <p className="px-2 py-2 text-sm font-medium text-gray-500">{menu.label}</p>
              <div className="ml-2 space-y-0.5">
                {menu.children.map((child) => (
                  <a
                    key={child.href}
                    href={child.href}
                    className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors ${
                      isMenuActive(pathname, child.href)
                        ? 'bg-gray-900 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {child.label}
                  </a>
                ))}
              </div>
            </div>
          )
        }

        return (
          <a
            key={menu.href}
            href={menu.href}
            className={`flex items-center px-2 py-2 text-sm rounded-lg transition-colors ${
              isMenuActive(pathname, menu.href)
                ? 'bg-gray-900 text-white font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {menu.label}
          </a>
        )
      })}
    </nav>
  )
}
