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
import { createEvent, updateEvent } from '@/app/(dashboard)/events/actions'
import type { EventDetailData, EventScheduleRow, EventRowDetailData } from '@/app/(dashboard)/events/actions'
import {
  EventProgramUnitSection,
  calcLectureFeeAfterTax,
  buildUnitPath,
  type FieldOption,
  type OccupationOption,
  type ProgramOption,
  type UnitOption,
  type MentorOption,
  type SelectedProgramUnit,
} from './EventProgramUnitSection'

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

type Campaign = {
  id: string
  name: string
}

type Admin = {
  id: string
  name: string
}

interface Props {
  institutions: Institution[]
  campaigns: Campaign[]
  salesAdmins: Admin[]
  commAdmins: Admin[]
  fields: FieldOption[]
  occupations: OccupationOption[]
  programs: ProgramOption[]
  units: UnitOption[]
  mentorsByUnit: Record<string, MentorOption[]>
  defaultInstitutionId?: string
  eventId?: string
  initialEvent?: EventDetailData
  initialSchedules?: EventScheduleRow[]
  initialEventRows?: EventRowDetailData[]
  initialEstimateFileUrl?: string | null
}

function splitDateTime(value: string | null): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date, timePart] = value.split('T')
  return { date, time: timePart ? timePart.slice(0, 5) : '' }
}

function toDatetimeLocal(value: string | null): string {
  return value ? value.slice(0, 16) : ''
}

function buildInitialProgramUnits(
  initialEventRows: EventRowDetailData[] | undefined,
  units: UnitOption[],
  programs: ProgramOption[],
  occupations: OccupationOption[],
  fields: FieldOption[]
): SelectedProgramUnit[] {
  if (!initialEventRows || initialEventRows.length === 0) return []
  return initialEventRows.map((r) => {
    const unit = units.find((u) => u.id === r.occupation_program_unit_id)
    const path = unit
      ? buildUnitPath(unit, programs, occupations, fields)
      : { fieldName: '-', occupationName: '-', programName: '-' }
    return {
      unitId: r.occupation_program_unit_id ?? '',
      title: unit?.title ?? '-',
      ...path,
      startTime: toDatetimeLocal(r.start_time),
      endTime: toDatetimeLocal(r.end_time),
      classroom: r.classroom ?? '',
      instructorWaitingRoom: r.instructor_waiting_room ?? '',
      lectureFee: r.lecture_fee,
      headcount: r.headcount,
      sessionHeadcount: r.session_headcount,
      mentorId: r.mentor_id,
    }
  })
}

function buildDefaultValues(
  initialEvent: EventDetailData | undefined,
  initialSchedules: EventScheduleRow[] | undefined,
  today: string
): Partial<EventFormData> {
  if (!initialEvent) return { reception_date: today }

  const start = splitDateTime(initialEvent.event_start_at)
  const end = splitDateTime(initialEvent.event_end_at)
  const findSchedule = (label: string) => initialSchedules?.find((s) => s.label === label)
  const s1 = findSchedule('1교시')
  const s2 = findSchedule('2교시')
  const lunch = findSchedule('점심시간')

  return {
    reception_date: initialEvent.created_at.split('T')[0],
    name: initialEvent.name,
    campaign_id: initialEvent.campaign_id,
    institution_id: initialEvent.institution_id,
    event_start_at_date: start.date,
    event_start_at_time: start.time,
    event_end_at_date: end.date,
    event_end_at_time: end.time,
    target_grade: initialEvent.target_grade,
    laptop_wifi_note: initialEvent.laptop_wifi_note,
    crime_check_method: initialEvent.crime_check_method as EventFormData['crime_check_method'],
    crime_check_info: initialEvent.crime_check_info,
    indoor_shoes_note: initialEvent.indoor_shoes_note,
    parking_note: initialEvent.parking_note,
    student_rotation: initialEvent.student_rotation as EventFormData['student_rotation'],
    notice: initialEvent.notice,
    prep_note: initialEvent.prep_note,
    memo: initialEvent.memo,
    schedule_1_start: s1?.start_time ?? '',
    schedule_1_end: s1?.end_time ?? '',
    schedule_2_start: s2?.start_time ?? '',
    schedule_2_end: s2?.end_time ?? '',
    schedule_lunch_start: lunch?.start_time ?? '',
    schedule_lunch_end: lunch?.end_time ?? '',
    contact_name: initialEvent.contact_name,
    contact_email: initialEvent.contact_email,
    contact_phone: initialEvent.contact_phone,
    inflow_source: initialEvent.inflow_source as EventFormData['inflow_source'],
    institution_type: initialEvent.institution_type as EventFormData['institution_type'],
    sales_admin_id: initialEvent.sales_admin_id,
    budget: initialEvent.budget,
    comm_admin_id: initialEvent.comm_admin_id,
  }
}

const inputCls =
  'flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500 transition-colors'
const selectCls =
  'flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm bg-white text-gray-700 outline-none focus:border-gray-500 transition-colors'
const labelCls = 'w-36 shrink-0 text-sm font-medium text-gray-700'
const rowCls = 'flex items-center gap-3'

export function EventForm({
  institutions,
  campaigns,
  salesAdmins,
  commAdmins,
  fields,
  occupations,
  programs,
  units,
  mentorsByUnit,
  defaultInstitutionId,
  eventId,
  initialEvent,
  initialSchedules,
  initialEventRows,
  initialEstimateFileUrl,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [estimateFile, setEstimateFile] = useState<File | null>(null)
  const [programUnits, setProgramUnits] = useState<SelectedProgramUnit[]>(() =>
    buildInitialProgramUnits(initialEventRows, units, programs, occupations, fields)
  )

  const initialInstitution = institutions.find((i) => i.id === initialEvent?.institution_id) ?? null
  const [institutionSearch, setInstitutionSearch] = useState(initialInstitution?.name ?? '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(initialInstitution)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: buildDefaultValues(initialEvent, initialSchedules, today),
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
    // Supabase Storage 키는 한글 등 비-ASCII 문자를 허용하지 않으므로 확장자만 사용
    const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
    const path = `estimates/${Date.now()}${ext ? `.${ext}` : ''}`
    const { error } = await supabase.storage.from('events').upload(path, file)
    if (error) throw new Error(error.message)
    // private 버킷이므로 경로만 저장 — 조회 시 signed URL로 변환
    return path
  }

  const onSubmit = (data: EventFormData) => {
    startTransition(async () => {
      // 새 파일을 업로드하지 않으면 기존 견적서 경로를 그대로 유지한다.
      let estimateFileUrl: string | undefined = eventId
        ? initialEvent?.estimate_file_url ?? undefined
        : undefined
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

      const payload = {
        reception_date: data.reception_date,
        name: data.name,
        campaign_id: data.campaign_id,
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
        eventRows: programUnits.map((u) => ({
          occupation_program_unit_id: u.unitId,
          start_time: u.startTime || null,
          end_time: u.endTime || null,
          classroom: u.classroom || null,
          instructor_waiting_room: u.instructorWaitingRoom || null,
          lecture_fee: u.lectureFee,
          lecture_fee_after_tax: calcLectureFeeAfterTax(u.lectureFee),
          headcount: u.headcount,
          session_headcount: u.sessionHeadcount,
          mentor_id: u.mentorId || null,
        })),
      }

      try {
        if (eventId) {
          await updateEvent(eventId, payload)
          router.push(data.institution_id ? `/institutions/${data.institution_id}` : '/institutions')
        } else {
          await createEvent(payload)
          router.push('/institutions')
        }
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
        <h1 className="text-2xl font-bold text-gray-900">{eventId ? '행사 수정' : '행사 등록'}</h1>
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
              {...register('campaign_id', { setValueAs: (v) => v || null })}
              className={selectCls}
            >
              <option value="">선택</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              {estimateFile ? (
                <p className="mt-1 text-xs text-gray-500">{estimateFile.name}</p>
              ) : (
                initialEstimateFileUrl && (
                  <a
                    href={initialEstimateFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-blue-500 hover:underline"
                  >
                    현재 견적서 보기
                  </a>
                )
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

      <div className="mt-8">
        <EventProgramUnitSection
          fields={fields}
          occupations={occupations}
          programs={programs}
          units={units}
          mentorsByUnit={mentorsByUnit}
          value={programUnits}
          onChange={setProgramUnits}
        />
      </div>
    </div>
  )
}
