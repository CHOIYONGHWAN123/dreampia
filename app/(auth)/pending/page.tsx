'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function PendingPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="text-center space-y-4">
      <div className="text-5xl mb-4">⏳</div>
      <h2 className="text-lg font-semibold text-gray-800">승인 대기 중입니다</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        회원가입이 완료되었습니다.
        <br />
        슈퍼관리자의 승인 후 시스템을 이용하실 수 있습니다.
        <br />
        승인이 완료되면 다시 로그인해주세요.
      </p>
      <button
        onClick={handleSignOut}
        className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        로그아웃
      </button>
    </div>
  )
}
