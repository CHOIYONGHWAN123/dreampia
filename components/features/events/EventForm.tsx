'use client'

import { useState, useMemo, useRef, useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  eventSchema,
  type EventFormData,
  CRIME_CHECK_METHODS,
  STUDENT_ROTATIONS,
  INFLOW_SOURCES,
  INSTITUTION_TYPES,
} from '@/lib/validations/event'
import { createEvent } from '@/app/(dashboard)/events/actions'

type Institution = {
  id: string
  name: string
  address: string | null
  region1: string
  region2: string | null
  category: string | null
  teacher_name: string | null
  admin_contact: string | null
  institution_type: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  laptop_wifi_note: string | null
  crime_check_method: string | null
  crime_check_info: string | null
  indoor_shoes_note: string | null
  parking_note: string | null
}

type Program = {
  id: string
  title: string
}

type Admin = {
  id: string
  name: string
}

interface Props {
  institutions: Institution[]
  programs: Program[]
  salesAdmins: Admin[]
  commAdmins: Admin[]
  defaultInstitutionId?: string
}

const inputCls =
  'flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500 transition-colors'
const selectCls =
  'flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm bg-white text-gray-700 outline-none focus:border-gray-500 transition-colors'
const labelCls = 'w-36 shrink-0 text-sm font-medium text-gray-700'
const rowCls = 'flex items-center gap-3'

export function EventForm({ institutions, programs, salesAdmins, commAdmins, defaultInstitutionId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [estimateFile, setEstimateFile] = useState<File | null>(null)

  const [institutionSearch, setInstitutionSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: { reception_date: today },
  })

  useEffect(() => {
    if (!defaultInstitutionId) return
    const inst = institutions.find((i) => i.id === defaultInstitutionId)
    if (inst) selectInstitution(inst)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const filteredInstitutions = useMemo(() => {
    if (!institutionSearch) return institutions.slice(0, 8)
    return institutions.filter((i) => i.name.includes(institutionSearch)).slice(0, 8)
  }, [institutions, institutionSearch])

  function selectInstitution(inst: Institution) {
    setSelectedInstitution(inst)
    setInstitutionSearch(inst.name)
    setValue('institution_id', inst.id)
    // contact_name/email/phone 우선, 없으면 기존 teacher_name/admin_contact로 폴백
    setValue('contact_name', inst.contact_name || inst.teacher_name || '')
    setValue('contact_email', inst.contact_email || '')
    setValue('contact_phone', inst.contact_phone || inst.admin_contact || '')
    if (inst.institution_type) setValue('institution_type', inst.institution_type as EventFormData['institution_type'])
    if (inst.laptop_wifi_note) setValue('laptop_wifi_note', inst.laptop_wifi_note)
    if (inst.crime_check_method) setValue('crime_check_method', inst.crime_check_method as EventFormData['crime_check_method'])
    if (inst.crime_check_info) setValue('crime_check_info', inst.crime_check_info)
    if (inst.indoor_shoes_note) setValue('indoor_shoes_note', inst.indoor_shoes_note)
    if (inst.parking_note) setValue('parking_note', inst.parking_note)
    setShowDropdown(false)
  }

  async function uploadEstimateFile(file: File): Promise<string> {
    const supabase = createClient()
    const path = `estimates/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('events').upload(path, file)
    if (error) throw new Error(error.message)
    // private 버킷이므로 경로만 저장 — 조회 시 signed URL로 변환
    return path
  }

  const onSubmit = (data: EventFormData) => {
    startTransition(async () => {
      let estimateFileUrl: string | undefined
      if (estimateFile) {
        setIsUploading(true)
        try {
          estimateFileUrl = await uploadEstimateFile(estimateFile)
        } catch (e) {
          alert('파일 업로드에 실패했습니다.')
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      }

      const buildTimestamp = (date?: string, time?: string) => {
        if (!date) return null
        return time ? `${date}T${time}:00` : `${date}T00:00:00`
      }
      const eventStartAt = buildTimestamp(data.event_start_at_date, data.event_start_at_time)
      const eventEndAt = buildTimestamp(data.event_end_at_date, data.event_end_at_time)

      const schedules = []
      if (data.schedule_1_start || data.schedule_1_end) {
        schedules.push({ label: '1교시', start_time: data.schedule_1_start ?? '', end_time: data.schedule_1_end ?? '', sort_order: 1 })
      }
      if (data.schedule_2_start || data.schedule_2_end) {
        schedules.push({ label: '2교시', start_time: data.schedule_2_start ?? '', end_time: data.schedule_2_end ?? '', sort_order: 2 })
      }
      if (data.schedule_lunch_start || data.schedule_lunch_end) {
        schedules.push({ label: '점심시간', start_time: data.schedule_lunch_start ?? '', end_time: data.schedule_lunch_end ?? '', sort_order: 3 })
      }

      try {
        await createEvent({
          reception_date: data.reception_date,
          name: data.name,
          occupation_program_id: data.occupation_program_id,
          institution_id: data.institution_id,
          event_start_at: eventStartAt,
          event_end_at: eventEndAt,
          target_grade: data.target_grade,
          laptop_wifi_note: data.laptop_wifi_note,
          crime_check_method: data.crime_check_method,
          crime_check_info: data.crime_check_info,
          indoor_shoes_note: data.indoor_shoes_note,
          parking_note: data.parking_note,
          student_rotation: data.student_rotation,
          notice: data.notice,
          prep_note: data.prep_note,
          memo: data.memo,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          inflow_source: data.inflow_source,
          institution_type: data.institution_type,
          sales_admin_id: data.sales_admin_id,
          budget: data.budget,
          estimate_file_url: estimateFileUrl,
          comm_admin_id: data.comm_admin_id,
          schedules,
        })
        router.push('/institutions')
      } catch {
        alert('저장에 실패했습니다.')
      }
    })
  }

  const isBusy = isPending || isUploading

  return (
    <div className="p-8 max-w-7xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">행사 등록</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isBusy}
            className="px-5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isBusy ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-12 gap-y-1">
        {/* ── 왼쪽 컬럼 ── */}
        <div className="space-y-3">
          {/* 접수일 */}
          <div className={rowCls}>
            <label className={labelCls}>접수일</label>
            <input type="date" {...register('reception_date')} className={inputCls} />
          </div>

          {/* 행사명 */}
          <div className={rowCls}>
            <label className={labelCls}>
              행사명 <span className="text-red-500">*</span>
            </label>
            <div className="flex-1">
              <input
                type="text"
                {...register('name')}
                placeholder="예: 드림피아초등학교 1학기 직업체험"
                className={inputCls.replace('flex-1 ', 'w-full ')}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
          </div>

          {/* 행사 구분 */}
          <div className={rowCls}>
            <label className={labelCls}>행사 구분</label>
            <select
              {...register('occupation_program_id', { setValueAs: (v) => v || null })}
              className={selectCls}
            >
              <option value="">선택</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* 학교/기관명 */}
          <div className={rowCls}>
            <label className={labelCls}>학교/기관명</label>
            <div className="flex-1 relative" ref={dropdownRef}>
              <input
                type="text"
                value={institutionSearch}
                onChange={(e) => {
                  setInstitutionSearch(e.target.value)
                  setShowDropdown(true)
                  if (!e.target.value) {
                    setSelectedInstitution(null)
                    setValue('institution_id', null)
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="기관명 검색..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500 transition-colors"
              />
              {showDropdown && filteredInstitutions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto">
                  {filteredInstitutions.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onMouseDown={() => selectInstitution(inst)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-800">{inst.name}</div>
                      {inst.address && <div className="text-xs text-gray-500 mt-0.5">{inst.address}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 주소 */}
          <div className={rowCls}>
            <label className={labelCls}>주소</label>
            <input
              type="text"
              value={selectedInstitution?.address ?? ''}
              readOnly
              placeholder="학교/기관 선택 시 자동 입력"
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm bg-gray-50 text-gray-500 cursor-default outline-none"
            />
          </div>

          {/* 행사 시작 일시 */}
          <div className={rowCls}>
            <label className={labelCls}>행사 시작 일시</label>
            <div className="flex gap-2 flex-1">
              <input type="date" {...register('event_start_at_date')} className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500" />
              <input type="time" {...register('event_start_at_time')} className="w-28 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500" />
            </div>
          </div>

          {/* 행사 종료 일시 */}
          <div className={rowCls}>
            <label className={labelCls}>행사 종료 일시</label>
            <div className="flex gap-2 flex-1">
              <input type="date" {...register('event_end_at_date')} className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500" />
              <input type="time" {...register('event_end_at_time')} className="w-28 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500" />
            </div>
          </div>

          {/* 대상학년 */}
          <div className={rowCls}>
            <label className={labelCls}>대상학년</label>
            <input type="text" {...register('target_grade')} placeholder="예: 1~3학년" className={inputCls} />
          </div>

          {/* 노트북/와이파이 */}
          <div className={rowCls}>
            <label className={labelCls}>노트북/와이파이</label>
            <input type="text" {...register('laptop_wifi_note')} className={inputCls} />
          </div>

          {/* 범죄경력 진행방식 */}
          <div className={rowCls}>
            <label className={labelCls}>범죄경력 진행방식</label>
            <select
              {...register('crime_check_method', { setValueAs: (v) => v || null })}
              className={selectCls}
            >
              <option value="">선택</option>
              {CRIME_CHECK_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 범죄경력회보서 */}
          <div className={rowCls}>
            <label className={labelCls}>범죄경력회보서</label>
            <input type="text" {...register('crime_check_info')} placeholder="기관아이디/검증번호" className={inputCls} />
          </div>

          {/* 실내화(내빈화)위치 */}
          <div className={rowCls}>
            <label className={labelCls}>실내화(내빈화)위치</label>
            <input type="text" {...register('indoor_shoes_note')} className={inputCls} />
          </div>

          {/* 주차 및 엘리베이터 */}
          <div className={rowCls}>
            <label className={labelCls}>주차 및 엘리베이터</label>
            <input type="text" {...register('parking_note')} className={inputCls} />
          </div>

          {/* 학생변경 여부 */}
          <div className={rowCls}>
            <label className={labelCls}>학생변경 여부</label>
            <select
              {...register('student_rotation', { setValueAs: (v) => v || null })}
              className={selectCls}
            >
              <option value="">선택</option>
              {STUDENT_ROTATIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 공지사항 */}
          <div className="flex gap-3">
            <label className={`${labelCls} pt-1.5`}>공지사항</label>
            <textarea
              {...register('notice')}
              rows={3}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500 resize-none transition-colors"
            />
          </div>

          {/* 준비사항(드림피아) */}
          <div className="flex gap-3">
            <label className={`${labelCls} pt-1.5`}>준비사항(드림피아)</label>
            <textarea
              {...register('prep_note')}
              rows={3}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500 resize-none transition-colors"
            />
          </div>

          {/* 메모 */}
          <div className="flex gap-3">
            <label className={`${labelCls} pt-1.5`}>메모</label>
            <textarea
              {...register('memo')}
              rows={3}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500 resize-none transition-colors"
            />
          </div>
        </div>

        {/* ── 오른쪽 컬럼 ── */}
        <div className="space-y-3">
          {/* 시정표 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">시정표</h3>
            <div className="space-y-2">
              {[
                { label: '1교시', startKey: 'schedule_1_start', endKey: 'schedule_1_end' },
                { label: '2교시', startKey: 'schedule_2_start', endKey: 'schedule_2_end' },
                { label: '점심시간', startKey: 'schedule_lunch_start', endKey: 'schedule_lunch_end' },
              ].map(({ label, startKey, endKey }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-20 text-sm text-gray-600 shrink-0">{label}</span>
                  <input
                    type="time"
                    {...register(startKey as keyof EventFormData)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:border-gray-500"
                  />
                  <span className="text-gray-400 text-sm">~</span>
                  <input
                    type="time"
                    {...register(endKey as keyof EventFormData)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm outline-none focus:border-gray-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 담당자 정보 */}
          <div className={rowCls}>
            <label className={labelCls}>담당자 성함</label>
            <input type="text" {...register('contact_name')} placeholder="예: 3학년 부장 홍길동" className={inputCls} />
          </div>

          <div className={rowCls}>
            <label className={labelCls}>담당자 이메일</label>
            <input type="email" {...register('contact_email')} className={inputCls} />
          </div>

          <div className={rowCls}>
            <label className={labelCls}>담당자 연락처</label>
            <input type="tel" {...register('contact_phone')} className={inputCls} />
          </div>

          {/* 유입경로 */}
          <div className={rowCls}>
            <label className={labelCls}>유입경로</label>
            <select
              {...register('inflow_source', { setValueAs: (v) => v || null })}
              className={selectCls}
            >
              <option value="">선택</option>
              {INFLOW_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 기관 */}
          <div className={rowCls}>
            <label className={labelCls}>기관</label>
            <select
              {...register('institution_type', { setValueAs: (v) => v || null })}
              className={selectCls}
            >
              <option value="">선택</option>
              {INSTITUTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 영업담당자 */}
          <div className={rowCls}>
            <label className={labelCls}>영업담당자</label>
            <select
              {...register('sales_admin_id', { setValueAs: (v) => v || null })}
              className={selectCls}
            >
              <option value="">선택</option>
              {salesAdmins.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* 예산 */}
          <div className={rowCls}>
            <label className={labelCls}>예산 (원)</label>
            <input
              type="number"
              {...register('budget', {
                setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
              })}
              placeholder="예산을 입력하세요"
              className={inputCls}
              min={0}
            />
          </div>

          {/* 견적서 */}
          <div className={rowCls}>
            <label className={labelCls}>견적서</label>
            <div className="flex-1">
              <input
                type="file"
                accept=".pdf,.hwp,.xlsx,.xls,.doc,.docx"
                onChange={(e) => setEstimateFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-xs file:bg-white file:text-gray-700 hover:file:bg-gray-50 cursor-pointer"
              />
              {estimateFile && (
                <p className="mt-1 text-xs text-gray-500">{estimateFile.name}</p>
              )}
            </div>
          </div>

          {/* 섭외시작일 (읽기 전용) */}
          <div className={rowCls}>
            <label className={labelCls}>섭외시작일</label>
            <input
              type="text"
              readOnly
              placeholder="섭외 시작 시 자동 등록"
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm bg-gray-50 text-gray-400 cursor-default outline-none"
            />
          </div>

          {/* 소통담당자 */}
          <div className={rowCls}>
            <label className={labelCls}>소통담당자</label>
            <select
              {...register('comm_admin_id', { setValueAs: (v) => v || null })}
              className={selectCls}
            >
              <option value="">선택</option>
              {commAdmins.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
