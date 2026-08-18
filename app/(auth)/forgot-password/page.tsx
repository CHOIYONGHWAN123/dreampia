'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormData,
  type ResetPasswordFormData,
} from '@/lib/validations/auth'

const inputCls =
  'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent'
const labelCls = 'block text-sm font-medium text-gray-600 mb-1'
const errorCls = 'mt-1 text-xs text-red-500'
const buttonCls =
  'w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-bold rounded-full shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [resendMessage, setResendMessage] = useState('')

  const requestForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const verifyForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onRequestSubmit = async (data: ForgotPasswordFormData) => {
    const supabase = createClient()
    // 계정 존재 여부와 무관하게 동일하게 안내 (계정 열거 방지)
    await supabase.auth.resetPasswordForEmail(data.email)
    setEmail(data.email)
    setStep('verify')
  }

  const handleResend = async () => {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email)
    setResendMessage('인증번호를 다시 보냈습니다.')
  }

  const onVerifySubmit = async (data: ResetPasswordFormData) => {
    const supabase = createClient()

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: data.code,
      type: 'recovery',
    })

    if (verifyError) {
      verifyForm.setError('root', { message: '인증번호가 올바르지 않거나 만료되었습니다.' })
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: data.password })

    if (updateError) {
      verifyForm.setError('root', { message: '비밀번호 변경에 실패했습니다. 다시 시도해주세요.' })
      return
    }

    await supabase.auth.signOut()
    window.location.href = '/login?reset=success'
  }

  if (step === 'request') {
    return (
      <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 mb-6">비밀번호 찾기</h2>

        <div>
          <label className={labelCls}>이메일</label>
          <input
            type="email"
            {...requestForm.register('email')}
            placeholder="admin@example.com"
            className={inputCls}
          />
          {requestForm.formState.errors.email && (
            <p className={errorCls}>{requestForm.formState.errors.email.message}</p>
          )}
        </div>

        <button type="submit" disabled={requestForm.formState.isSubmitting} className={buttonCls}>
          {requestForm.formState.isSubmitting ? '전송 중...' : '인증번호 받기'}
        </button>

        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="text-primary-600 hover:underline font-medium">
            로그인 화면으로 돌아가기
          </Link>
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900 mb-6">비밀번호 재설정</h2>
      <p className="text-sm text-gray-500 -mt-2 mb-2">
        {email}로 인증번호를 보냈습니다. 이메일을 확인해주세요.
      </p>

      <div>
        <label className={labelCls}>인증번호</label>
        <input
          type="text"
          {...verifyForm.register('code')}
          placeholder="6자리 숫자"
          className={inputCls}
        />
        {verifyForm.formState.errors.code && (
          <p className={errorCls}>{verifyForm.formState.errors.code.message}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>새 비밀번호</label>
        <input
          type="password"
          {...verifyForm.register('password')}
          placeholder="6자 이상"
          className={inputCls}
        />
        {verifyForm.formState.errors.password && (
          <p className={errorCls}>{verifyForm.formState.errors.password.message}</p>
        )}
      </div>

      <div>
        <label className={labelCls}>새 비밀번호 확인</label>
        <input
          type="password"
          {...verifyForm.register('confirmPassword')}
          placeholder="비밀번호 재입력"
          className={inputCls}
        />
        {verifyForm.formState.errors.confirmPassword && (
          <p className={errorCls}>{verifyForm.formState.errors.confirmPassword.message}</p>
        )}
      </div>

      {verifyForm.formState.errors.root && (
        <p className="text-sm text-red-500 text-center">{verifyForm.formState.errors.root.message}</p>
      )}

      <button type="submit" disabled={verifyForm.formState.isSubmitting} className={buttonCls}>
        {verifyForm.formState.isSubmitting ? '변경 중...' : '비밀번호 변경'}
      </button>

      <p className="text-center text-sm text-gray-500">
        인증번호를 못 받으셨나요?{' '}
        <button type="button" onClick={handleResend} className="text-primary-600 hover:underline font-medium">
          재전송
        </button>
      </p>
      {resendMessage && <p className="text-center text-xs text-gray-400">{resendMessage}</p>}

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="text-primary-600 hover:underline font-medium">
          로그인 화면으로 돌아가기
        </Link>
      </p>
    </form>
  )
}
