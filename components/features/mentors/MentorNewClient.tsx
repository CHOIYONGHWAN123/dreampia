'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMentor, type AddProgramSelectData, type CreateMentorProgramInput } from '@/app/(dashboard)/mentors/actions'
import { AreaSelector, MentorSearchSelect, FileDropZone, uploadFile } from './shared'
import { DaumAddressButton } from './DaumAddressButton'
import { FieldSectionForm } from './FieldSectionForm'
import { createFieldSection, type FieldSectionState } from './new-mentor-types'
import { BANK_OPTIONS } from '@/constants/banks'
import { generateId } from '@/lib/generate-id'

const inputCls =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300'
const labelCls = 'text-xs text-gray-500 mb-1 block'

export function MentorNewClient({ selectData }: { selectData: AddProgramSelectData }) {
  const router = useRouter()
  const [mentorId] = useState(() => generateId())

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [detailAddress, setDetailAddress] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [belongsTo, setBelongsTo] = useState('')
  const [availableAreas, setAvailableAreas] = useState<string[]>([])
  const [agreementFile, setAgreementFile] = useState<File | null>(null)

  const [fieldSections, setFieldSections] = useState<FieldSectionState[]>([createFieldSection()])
  const [submitting, setSubmitting] = useState(false)

  const globalExcludedUnitIds = useMemo(() => {
    const ids = fieldSections.flatMap((s) =>
      s.programEntries.flatMap((e) => e.selection.levels.map((l) => l.unitId))
    )
    return new Set(ids.filter(Boolean))
  }, [fieldSections])

  const updateSection = (next: FieldSectionState) => {
    setFieldSections((prev) => prev.map((s) => (s.key === next.key ? next : s)))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }
    if (email.trim() && !password) {
      alert('이메일을 입력한 경우 비밀번호도 입력해주세요.')
      return
    }
    if (password && password.length < 6) {
      alert('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (password && password !== passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다.')
      return
    }

    setSubmitting(true)
    try {
      let agreementFileUrl: string | null = null
      if (agreementFile) {
        agreementFileUrl = await uploadFile('agreement-file', mentorId, agreementFile)
      }

      const programs: CreateMentorProgramInput[] = []
      for (const section of fieldSections) {
        for (const entry of section.programEntries) {
          for (const level of entry.selection.levels) {
            if (!level.unitId) continue
            const pptFile = entry.pptFiles[level.schoolLevel]
            const pptFileUrl = pptFile ? await uploadFile('ppt-file', `${mentorId}/${level.unitId}`, pptFile) : null
            const profileFile = entry.profileFiles[level.schoolLevel]
            const profileFileUrl = profileFile
              ? await uploadFile('profile-file', `${mentorId}/${level.unitId}`, profileFile)
              : null
            programs.push({
              occupationProgramUnitId: level.unitId,
              lectureFeePayerId: entry.lectureFeePayerId || null,
              materialFeePayerId: entry.materialFeePayerId || null,
              pptFileUrl,
              profileFileUrl,
            })
          }
        }
      }

      const bankAccount = [bankName, bankAccountNumber.trim()].filter(Boolean).join(' ') || null

      await createMentor({
        id: mentorId,
        userId: userId.trim() || null,
        email: email.trim() || null,
        password: password || null,
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        detailAddress: detailAddress.trim() || null,
        idNumber: idNumber.trim() || null,
        bankAccount,
        belongsTo: belongsTo || null,
        availableAreas: availableAreas.length ? availableAreas : null,
        agreementFileUrl,
        programs,
      })

      router.push('/mentors')
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강사 추가</h1>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          {submitting ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="space-y-4">
        {/* 로그인 계정 */}
        <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/40 space-y-3">
          <p className="text-xs font-medium text-blue-700">강사 앱 로그인 계정 <span className="font-normal text-blue-500">(선택 — 입력 시 자동으로 계정이 생성됩니다)</span></p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>이메일</label>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mentor@example.com"
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputCls} ${passwordConfirm && password !== passwordConfirm ? 'border-red-400 focus:ring-red-300' : ''}`}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 재입력"
                  autoComplete="new-password"
                />
                {passwordConfirm && password !== passwordConfirm && (
                  <span className="absolute -bottom-4 left-0 text-[11px] text-red-500">비밀번호가 일치하지 않습니다</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>이름</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>연락처</label>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>주민번호</label>
            <input className={inputCls} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>주소</label>
          <div className="flex gap-2">
            <input className={`${inputCls} flex-1 min-w-0`} value={address} readOnly placeholder="주소 검색을 눌러주세요" />
            <DaumAddressButton onComplete={setAddress} />
          </div>
          <input
            className={`${inputCls} mt-2`}
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            placeholder="상세 주소"
          />
        </div>

        <div>
          <label className={labelCls}>계좌번호</label>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300 w-40 shrink-0"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            >
              <option value="">은행 선택</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            <input
              className={`${inputCls} flex-1 min-w-0`}
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="계좌번호"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>소속 강사</label>
          <MentorSearchSelect
            mentors={selectData.mentors}
            value={belongsTo}
            onChange={setBelongsTo}
            placeholder="소속 강사 검색"
          />
        </div>

        <div>
          <div className="flex items-center gap-3 mb-1">
            <label className={labelCls}>동의서</label>
            <a
              href="/templates/agreement-form.hwpx"
              download="드림피아_동의서_양식.hwpx"
              className="text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
            >
              양식 다운로드
            </a>
          </div>
          <FileDropZone
            file={agreementFile}
            onChange={setAgreementFile}
            accept=".hwp,.hwpx,.pdf,.doc,.docx"
          />
        </div>

        <div>
          <label className={labelCls}>출강 가능 지역</label>
          <AreaSelector value={availableAreas} onChange={setAvailableAreas} />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">프로그램</h2>
        {fieldSections.map((section) => (
          <FieldSectionForm
            key={section.key}
            section={section}
            fields={selectData.fields}
            occupations={selectData.occupations}
            programs={selectData.programs}
            units={selectData.units}
            programCategories={selectData.programCategories}
            mentors={selectData.mentors}
            globalExcludedUnitIds={globalExcludedUnitIds}
            selfId={mentorId}
            onChange={updateSection}
            onRemove={
              fieldSections.length > 1
                ? () => setFieldSections((prev) => prev.filter((s) => s.key !== section.key))
                : undefined
            }
          />
        ))}
        <button
          type="button"
          onClick={() => setFieldSections((prev) => [...prev, createFieldSection()])}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + 분야 추가
        </button>
      </div>
    </div>
  )
}
