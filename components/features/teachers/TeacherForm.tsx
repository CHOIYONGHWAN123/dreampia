'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resetTeacherPassword,
  createTeacherAccount,
  type TeacherRow,
  type InstitutionOption,
} from '@/app/(dashboard)/teachers/actions'
import { InstitutionSearchSelect } from './shared'

const inputCls =
  'w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300'
const labelCls = 'text-xs text-gray-500 mb-1 block'

export function TeacherForm({
  selectData,
  teacher,
}: {
  selectData: { institutions: InstitutionOption[] }
  teacher?: TeacherRow
}) {
  const router = useRouter()
  const isEdit = !!teacher

  const [institutionId, setInstitutionId] = useState(teacher?.institutionId ?? '')
  const [name, setName] = useState(teacher?.name ?? '')
  const [submitting, setSubmitting] = useState(false)

  // 생성 모드 전용 로그인 계정 입력
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // 수정 모드: 계정이 없는 선생님에게 새로 계정을 만들어주는 입력
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [newAccountPassword, setNewAccountPassword] = useState('')
  const [creatingAccount, setCreatingAccount] = useState(false)

  // 수정 모드: 기존 계정 비밀번호 재설정
  const [resetPassword, setResetPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  const validateAccountFields = (emailValue: string, passwordValue: string, confirmValue: string) => {
    if (emailValue.trim() && !passwordValue) {
      alert('이메일을 입력한 경우 비밀번호도 입력해주세요.')
      return false
    }
    if (passwordValue && passwordValue.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.')
      return false
    }
    if (passwordValue && passwordValue !== confirmValue) {
      alert('비밀번호가 일치하지 않습니다.')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!institutionId) {
      alert('학교를 선택해주세요.')
      return
    }
    if (!name.trim()) {
      alert('선생님 성함을 입력해주세요.')
      return
    }

    if (!isEdit && !validateAccountFields(email, password, passwordConfirm)) return

    setSubmitting(true)
    try {
      if (isEdit) {
        await updateTeacher(teacher.id, { institutionId, name: name.trim() })
      } else {
        await createTeacher({
          institutionId,
          name: name.trim(),
          email: email.trim() || null,
          password: password || null,
        })
      }
      router.push('/teachers')
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateAccount = async () => {
    if (!teacher) return
    if (!validateAccountFields(newAccountEmail, newAccountPassword, newAccountPassword)) return
    if (!newAccountEmail.trim() || !newAccountPassword) {
      alert('이메일과 비밀번호를 입력해주세요.')
      return
    }
    setCreatingAccount(true)
    try {
      await createTeacherAccount(teacher.id, newAccountEmail.trim(), newAccountPassword)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : '계정 생성에 실패했습니다.')
    } finally {
      setCreatingAccount(false)
    }
  }

  const handleResetPassword = async () => {
    if (!teacher?.userId) return
    if (resetPassword.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setResettingPassword(true)
    try {
      await resetTeacherPassword(teacher.userId, resetPassword)
      setResetPassword('')
      alert('비밀번호가 재설정되었습니다.')
    } catch (e) {
      alert(e instanceof Error ? e.message : '비밀번호 재설정에 실패했습니다.')
    } finally {
      setResettingPassword(false)
    }
  }

  const handleDelete = async () => {
    if (!teacher) return
    if (!confirm('이 선생님 계정을 삭제할까요?')) return
    try {
      await deleteTeacher(teacher.id)
      router.push('/teachers')
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>학교</label>
        <InstitutionSearchSelect
          institutions={selectData.institutions}
          value={institutionId}
          onChange={setInstitutionId}
        />
      </div>

      <div>
        <label className={labelCls}>선생님 성함</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {!isEdit && (
        <div className="rounded-2xl p-4 bg-primary-50 space-y-3">
          <p className="text-xs font-bold text-primary-700">
            로그인 계정 <span className="font-normal text-primary-500">(선택 — 입력 시 자동으로 계정이 생성됩니다)</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>이메일</label>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelCls}>비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '숨기기' : '보기'}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>비밀번호 확인</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`${inputCls} ${passwordConfirm && password !== passwordConfirm ? 'border-red-400 focus:ring-red-300' : ''}`}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
      )}

      {isEdit && (
        <div className="bg-white rounded-2xl shadow-[0_8px_22px_rgba(20,20,40,0.05)] p-4 space-y-3">
          <p className="text-xs font-bold text-gray-700">로그인 계정</p>
          {teacher.userId ? (
            <>
              <p className="text-sm text-gray-600">아이디: {teacher.email ?? '-'}</p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  className={inputCls}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="새 비밀번호 (6자 이상)"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resettingPassword || resetPassword.length < 6}
                  className="px-3 py-2 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {resettingPassword ? '재설정 중...' : '비밀번호 재설정'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400">아직 로그인 계정이 없습니다.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>이메일</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={newAccountEmail}
                    onChange={(e) => setNewAccountEmail(e.target.value)}
                    placeholder="teacher@example.com"
                    autoComplete="off"
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>비밀번호</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={newAccountPassword}
                    onChange={(e) => setNewAccountPassword(e.target.value)}
                    placeholder="6자 이상"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={creatingAccount}
                className="px-3 py-2 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 disabled:opacity-50"
              >
                {creatingAccount ? '생성 중...' : '계정 생성'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2 bg-primary-500 text-white rounded-full text-sm font-bold hover:bg-primary-600 disabled:opacity-50"
        >
          {submitting ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
