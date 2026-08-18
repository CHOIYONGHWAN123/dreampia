'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { signupSchema, type SignupFormData } from '@/lib/validations/auth'

export default function SignupPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // DB Trigger(on_admin_signup)가 이 값을 읽어 admins에 행을 생성한다.
        // account_type으로 멘토 앱 회원가입(on_mentor_signup)과 분기된다.
        data: { name: data.name, account_type: 'admin' },
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setError('email', { message: '이미 사용 중인 이메일입니다.' })
      } else {
        setError('root', { message: error.message })
      }
      return
    }

    router.push('/pending')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 mb-6">회원가입</h2>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          이름
        </label>
        <input
          type="text"
          {...register('name')}
          placeholder="홍길동"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          이메일
        </label>
        <input
          type="email"
          {...register('email')}
          placeholder="admin@example.com"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
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
          placeholder="6자 이상"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          비밀번호 확인
        </label>
        <input
          type="password"
          {...register('confirmPassword')}
          placeholder="••••••••"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-500">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-bold rounded-full shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors"
      >
        {isSubmitting ? '처리 중...' : '회원가입'}
      </button>

      <p className="text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-primary-600 hover:underline font-medium">
          로그인
        </Link>
      </p>
    </form>
  )
}
