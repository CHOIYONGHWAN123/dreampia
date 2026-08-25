import { getCurrentAdmin } from '@/lib/supabase-server'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { NavMenu } from '@/components/ui/NavMenu'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getCurrentAdmin()

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex">
      {/* 사이드바 */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
        <div className="px-6 py-7 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-extrabold text-gray-900 tracking-tight">드림피아</span>
            <span className="w-2 h-2 rounded-full bg-gold-500" />
          </div>
          <p className="text-xs text-gray-400 font-medium">관리자 시스템</p>
        </div>
        <div className="h-px bg-gray-100 mx-6 mb-2" />
        <NavMenu isSuperAdmin={admin.isSuper} />
        <div className="p-4 border-t border-gray-100 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center text-sm font-bold shrink-0">
            {admin.name[0] ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 truncate">{admin.name}</p>
            <p className="text-xs text-gray-400 truncate">{admin.email}</p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <LogoutButton />
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
