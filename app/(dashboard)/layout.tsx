import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/ui/LogoutButton'
import { NavMenu } from '@/components/ui/NavMenu'

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
        <NavMenu />
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
