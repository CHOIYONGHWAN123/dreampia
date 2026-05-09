import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/ui/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('name, email, is_super')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="font-bold text-gray-900">드림피아</p>
          <p className="text-xs text-gray-400 mt-0.5">관리자 시스템</p>
        </div>
        <nav className="flex-1 p-3">
          <p className="text-xs font-medium text-gray-400 px-2 mb-2">메뉴</p>
          <a
            href="/dashboard"
            className="flex items-center px-2 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            대시보드
          </a>
          <a
            href="/company-info"
            className="flex items-center px-2 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            회사소개
          </a>
          <a
            href="/terms"
            className="flex items-center px-2 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            이용약관
          </a>
          <a
            href="/announcements"
            className="flex items-center px-2 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
          >
            공지사항
          </a>
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <p className="text-sm font-medium text-gray-800">{admin?.name}</p>
          <p className="text-xs text-gray-400 truncate">{admin?.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
