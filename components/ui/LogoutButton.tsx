'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left px-2 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors"
    >
      로그아웃
    </button>
  )
}
