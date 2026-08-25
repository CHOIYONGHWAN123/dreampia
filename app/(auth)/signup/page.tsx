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

    // 멘토 앱과 auth.users를 공유하므로, 입력한 이메일이 이미 멘토로 가입된 계정일 수 있다.
    // 이 경우 로그인이 먼저 성공한다 — admins 행만 없는 것이므로 새로 만들어 관리자를 겸직시킨다.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (!signInError && signInData.user) {
      const { data: existingAdmin } = await supabase
        .from('admins')
        .select('id')
        .eq('id', signInData.user.id)
        .maybeSingle()

      if (existingAdmin) {
        // 이미 관리자로도 가입되어 있음 — 그냥 로그인된 것으로 처리한다.
        router.push('/')
        return
      }

      const { error: insertError } = await supabase.from('admins').insert({
        id: signInData.user.id,
        name: data.name,
        email: signInData.user.email,
        is_authenticated: false,
      })

      if (insertError) {
        setError('root', { message: insertError.message })
        return
      }

      router.push('/pending')
      return
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
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
        setError('email', { message: '이미 사용 중인 이메일입니다. 비밀번호가 다르다면 로그인 페이지에서 비밀번호를 재설정해주세요.' })
      } else {
        setError('root', { message: error.message })
      }
      return
    }

    // 이메일 확인이 켜져 있으면 이미 가입된 이메일이어도 signUp()이 에러 없이
    // "빈 identities"를 담아 응답한다(보안상 계정 존재 여부를 숨기기 위함) — 이 경우도 감지해야 한다.
    if (signUpData.user && signUpData.user.identities?.length === 0) {
      setError('email', { message: '이미 사용 중인 이메일입니다. 비밀번호가 다르다면 로그인 페이지에서 비밀번호를 재설정해주세요.' })
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
