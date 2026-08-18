'use client'

import { usePathname } from 'next/navigation'

type MenuItem =
  | { href: string; label: string; children?: undefined }
  | { href?: undefined; label: string; children: { href: string; label: string }[] }

const BASE_MENUS: MenuItem[] = [
  { href: '/dashboard', label: '대시보드' },
  {
    label: '나의 할일',
    children: [
      { href: '/my-tasks/recruiting', label: '강사 섭외' },
      { href: '/my-tasks/estimate', label: '견적서 제작' },
      { href: '/my-tasks/supplies', label: '준비물 준비' },
      { href: '/my-tasks/recruit-delivery', label: '강사 섭외 전달' },
      { href: '/my-tasks/institution-request', label: '기관 요청사항 전달' },
      { href: '/my-tasks/admin-docs', label: '행정서류 전달' },
      { href: '/my-tasks/contract-delivery', label: '계약 전달' },
      { href: '/my-tasks/pre-notice', label: '행사 안내' },
      { href: '/my-tasks/photo-delivery', label: '행사 사진 전달' },
      { href: '/my-tasks/report-delivery', label: '보고서 전달' },
    ],
  },
  { href: '/counter', label: '카운터 관리' },
  { href: '/company-info', label: '회사소개' },
  { href: '/terms', label: '이용약관' },
  { href: '/announcements', label: '공지사항' },
  { href: '/banners', label: '배너' },
  { href: '/institutions', label: '기관' },
  { href: '/mentors', label: '강사' },
  { href: '/mentor-fees', label: '강사료 대장' },
  { href: '/teachers', label: '선생님' },
  { href: '/programs', label: '프로그램' },
  { href: '/supplies', label: '준비물 관리' },
  { href: '/event-operations', label: '행사운영확인표' },
  { href: '/event-check', label: '일자별 행사 진행 여부' },
]

function isMenuActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function NavMenu({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname()
  // 관리자 승인/권한 변경, 수익 데이터는 슈퍼관리자만 다룰 수 있어서, 메뉴 자체도
  // 슈퍼관리자에게만 보여준다(페이지 접근은 서버에서도 별도로 다시 확인한다).
  const menus: MenuItem[] = isSuperAdmin
    ? [...BASE_MENUS, { href: '/monthly-revenue', label: '월별 수익 관리' }, { href: '/admins', label: '관리자 관리' }]
    : BASE_MENUS

  return (
    <nav className="flex-1 px-4 pb-3 space-y-0.5 overflow-y-auto">
      <p className="text-[11px] font-bold text-gray-400 px-3 mb-2 tracking-wide">메뉴</p>
      {menus.map((menu) => {
        if (menu.children) {
          return (
            <div key={menu.label} className="mb-1">
              <p className="px-3 py-2 text-sm font-semibold text-gray-500">{menu.label}</p>
              <div className="ml-1 space-y-0.5">
                {menu.children.map((child) => (
                  <a
                    key={child.href}
                    href={child.href}
                    className={`block px-3 py-2 pl-7 text-[13px] rounded-full transition-colors ${
                      isMenuActive(pathname, child.href)
                        ? 'bg-primary-50 text-primary-600 font-bold'
                        : 'text-gray-500 hover:bg-gray-50'
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
            className={`flex items-center px-3 py-2.5 text-sm rounded-full transition-colors ${
              isMenuActive(pathname, menu.href)
                ? 'bg-primary-50 text-primary-600 font-bold'
                : 'text-gray-600 hover:bg-gray-50 font-medium'
            }`}
          >
            {menu.label}
          </a>
        )
      })}
    </nav>
  )
}
