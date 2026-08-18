'use client'

import { Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setError('root', { message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
      return
    }

    // 풀 페이지 이동으로 쿠키가 포함된 새 요청을 보내 프록시가 올바르게 리다이렉트
    window.location.href = '/'
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 mb-6">로그인</h2>

      {resetSuccess && (
        <p className="text-sm text-emerald-600 text-center bg-emerald-50 rounded-full py-2">
          비밀번호가 변경되었습니다. 다시 로그인해주세요.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          이메일
        </label>
        <input
          type="email"
          {...register('email')}
          placeholder="admin@example.com"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent text-black"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          비밀번호
        </label>
        <input
          type="password"
          {...register('password')}
          placeholder="••••••••"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
        )}
        <p className="mt-1 text-right">
          <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline font-medium">
            비밀번호를 잊으셨나요?
          </Link>
        </p>
      </div>

      {errors.root && (
        <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-bold rounded-full shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors"
      >
        {isSubmitting ? '로그인 중...' : '로그인'}
      </button>

      <p className="text-center text-sm text-gray-500">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-primary-600 hover:underline font-medium">
          회원가입
        </Link>
      </p>
    </form>
  )
}
