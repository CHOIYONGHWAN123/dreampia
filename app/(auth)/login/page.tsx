'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setError('root', { message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
      return
    }

    // 미들웨어가 is_authenticated 값에 따라 /dashboard 또는 /pending으로 리다이렉트
    router.refresh() // 서버 컴포넌트를 다시 렌더링, supabase 세션 쿠키를 브라우저에 반영
    router.push('/')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">로그인</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          이메일
        </label>
        <input
          type="email"
          {...register('email')}
          placeholder="admin@example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호
        </label>
        <input
          type="password"
          {...register('password')}
          placeholder="••••••••"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? '로그인 중...' : '로그인'}
      </button>

      <p className="text-center text-sm text-gray-500">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-blue-600 hover:underline font-medium">
          회원가입
        </Link>
      </p>
    </form>
  )
}
