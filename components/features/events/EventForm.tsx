'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
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
import type { EventDetailData, EventScheduleRow, EventRowDetailData, EventRowPhoto } from '@/app/(dashboard)/events/actions'
import {
  EventProgramUnitSection,
  calcLectureFeeAfterTax,
  buildUnitPath,
  type EventCategoryOption,
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
  institution_type: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  instructor_waiting_room: string | null
  admin_contact: string | null
  has_elevator: boolean | null
  floor_map_url: string | null
  laptop_wifi_note: string | null
  crime_check_method: string | null
  crime_check_info: string | null
  indoor_shoes_note: string | null
  parking_note: string | null
  teacher_name: string | null
  is_deleted?: boolean
}

type Admin = {
  id: string
  name: string
}

interface Props {
  institution: Institution | null
  salesAdmins: Admin[]
  commAdmins: Admin[]
  eventCategories: EventCategoryOption[]
  fields: FieldOption[]
  occupations: OccupationOption[]
  programs: ProgramOption[]
  units: UnitOption[]
  mentorsByUnit: Record<string, MentorOption[]>
  eventId?: string
  initialEvent?: EventDetailData
  initialSchedules?: EventScheduleRow[]
  initialEventRows?: EventRowDetailData[]
  initialEstimateFileUrl?: string | null
  initialPhotosByRow?: Record<string, EventRowPhoto[]>
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
      key: r.id,
      rowId: r.id,
      unitId: r.occupation_program_unit_id ?? '',
      title: unit?.title ?? '-',
      ...path,
      schoolRequestNote: unit?.school_request_note ?? null,
      schoolRequestResponse: r.school_request_response ?? '',
      finalProductAvailable: unit?.final_product_available ?? null,
      isDeliveryAvailable: unit?.is_delivery_available ?? null,
      mentorMaterialCost: unit?.mentor_material_cost ?? null,
      dreampiaMaterialCost: unit?.dreampia_material_cost ?? null,
      startTime: toDatetimeLocal(r.start_time),
      endTime: toDatetimeLocal(r.end_time),
      classroom: r.classroom ?? '',
      instructorWaitingRoom: r.instructor_waiting_room ?? '',
      target: r.target ?? '',
      lectureFee: r.lecture_fee,
      headcount: r.headcount,
      sessionHeadcount: r.session_headcount,
      mentorId: r.mentor_id,
      remarks: r.remarks ?? '',
      attendance: r.attendance,
    }
  })
}

function buildDefaultValues(
  initialEvent: EventDetailData | undefined,
  initialSchedules: EventScheduleRow[] | undefined,
  today: string
): Partial<EventFormData> {
  if (!initialEvent) return { reception_date: today, institution_id: null }

  const start = splitDateTime(initialEvent.event_start_at)
  const end = splitDateTime(initialEvent.event_end_at)
  const findSchedule = (label: string) => initialSchedules?.find((s) => s.label === label)
  const s1 = findSchedule('1교시')
  const s2 = findSchedule('2교시')
  const lunch = findSchedule('점심시간')

  return {
    reception_date: initialEvent.created_at.split('T')[0],
    name: initialEvent.name,
    institution_id: initialEvent.institution_id,
    event_category_id: initialEvent.event_category_id,
    event_start_date: start.date,
    event_start_at_time: start.time,
    event_end_date: end.date,
    event_end_at_time: end.time,
    target_grade: initialEvent.target_grade,
    instructor_waiting_room: initialEvent.instructor_waiting_room,
    admin_contact: initialEvent.admin_contact,
    has_elevator: initialEvent.has_elevator ?? undefined,
    floor_map_url: initialEvent.floor_map_url ?? '',
    laptop_wifi_note: initialEvent.laptop_wifi_note,
    crime_check_method: initialEvent.crime_check_method as EventFormData['crime_check_method'],
    crime_check_info: initialEvent.crime_check_info,
    indoor_shoes_note: initialEvent.indoor_shoes_note,
    parking_note: initialEvent.parking_note,
    student_rotation: initialEvent.student_rotation as EventFormData['student_rotation'],
    notice: initialEvent.notice,
    prep_note: initialEvent.prep_note,
    memo: initialEvent.memo,
    school_request_note: initialEvent.school_request_note,
    schedule_1_start: s1?.start_time ?? '',
    schedule_1_end: s1?.end_time ?? '',
    schedule_2_start: s2?.start_time ?? '',
    schedule_2_end: s2?.end_time ?? '',
    schedule_lunch_start: lunch?.start_time ?? '',
    schedule_lunch_end: lunch?.end_time ?? '',
    contact_name: initialEvent.contact_name,
    contact_email: initialEvent.contact_email,
    contact_phone: initialEvent.contact_phone,
    teacher_name: initialEvent.teacher_name,
    inflow_source: initialEvent.inflow_source as EventFormData['inflow_source'],
    institution_type: initialEvent.institution_type as EventFormData['institution_type'],
    sales_admin_id: initialEvent.sales_admin_id,
    budget: initialEvent.budget,
    comm_admin_id: initialEvent.comm_admin_id,
  }
}

// 엑셀 시트처럼 라벨 셀 + 입력 셀이 테두리로 구분되는 표 형태 스타일
const cellLabelCls =
  'px-3 py-2 border border-primary-100 bg-primary-50 text-sm font-bold text-primary-700 whitespace-nowrap align-top w-36'
const cellValueCls = 'px-2 py-1 border border-primary-100 align-middle'
const cellInputCls =
  'w-full px-1.5 py-1 text-sm outline-none bg-transparent focus:bg-primary-50 rounded-sm transition-colors'
const cellSelectCls =
  'w-full px-1.5 py-1 text-sm bg-white outline-none focus:bg-primary-50 rounded-sm transition-colors text-gray-700'
const tableCls = 'w-full border-collapse'

export function EventForm({
  institution,
  salesAdmins,
  commAdmins,
  eventCategories,
  fields,
  occupations,
  programs,
  units,
  mentorsByUnit,
  eventId,
  initialEvent,
  initialSchedules,
  initialEventRows,
  initialEstimateFileUrl,
  initialPhotosByRow,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [estimateFile, setEstimateFile] = useState<File | null>(null)
  const [floorMapFile, setFloorMapFile] = useState<File | null>(null)
  const floorMapInputRef = useRef<HTMLInputElement>(null)
  const [programUnits, setProgramUnits] = useState<SelectedProgramUnit[]>(() =>
    buildInitialProgramUnits(initialEventRows, units, programs, occupations, fields)
  )

  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: buildDefaultValues(initialEvent, initialSchedules, today),
  })

  // 신규 등록 시 기관 정보를 폼에 자동 입력
  useEffect(() => {
    if (!institution || initialEvent) return
    setValue('institution_id', institution.id)
    setValue('contact_name', institution.contact_name || '')
    setValue('contact_email', institution.contact_email || '')
    setValue('contact_phone', institution.contact_phone || '')
    if (institution.institution_type) setValue('institution_type', institution.institution_type as EventFormData['institution_type'])
    if (institution.instructor_waiting_room) setValue('instructor_waiting_room', institution.instructor_waiting_room)
    if (institution.admin_contact) setValue('admin_contact', institution.admin_contact)
    if (institution.has_elevator !== null) setValue('has_elevator', institution.has_elevator ?? undefined)
    if (institution.floor_map_url) setValue('floor_map_url', institution.floor_map_url)
    if (institution.laptop_wifi_note) setValue('laptop_wifi_note', institution.laptop_wifi_note)
    if (institution.crime_check_method) setValue('crime_check_method', institution.crime_check_method as EventFormData['crime_check_method'])
    if (institution.crime_check_info) setValue('crime_check_info', institution.crime_check_info)
    if (institution.indoor_shoes_note) setValue('indoor_shoes_note', institution.indoor_shoes_note)
    if (institution.parking_note) setValue('parking_note', institution.parking_note)
    if (institution.teacher_name) setValue('teacher_name', institution.teacher_name)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // 학교 배치도는 기관 정보의 배치도와 같은 성격(민감정보 아님)이라, institutions와 동일하게
  // 공개 버킷 + 공개 URL로 저장한다(견적서처럼 signed URL 변환이 필요 없음).
  async function uploadFloorMap(file: File): Promise<string> {
    const supabase = createClient()
    const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
    const path = `floor-maps/${eventId ?? Date.now()}-${Date.now()}${ext ? `.${ext}` : ''}`
    const { error } = await supabase.storage.from('files').upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(path)
    return urlData.publicUrl
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

      let floorMapUrl = data.floor_map_url
      if (floorMapFile) {
        setIsUploading(true)
        try {
          floorMapUrl = await uploadFloorMap(floorMapFile)
        } catch (e) {
          alert('배치도 파일 업로드에 실패했습니다.')
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      }

      const buildTimestamp = (date?: string, time?: string) => {
        if (!date) return null
        return time ? `${date}T${time}:00` : `${date}T00:00:00`
      }
      const eventStartAt = buildTimestamp(data.event_start_date, data.event_start_at_time)
      const eventEndAt = buildTimestamp(data.event_end_date, data.event_end_at_time)

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
        institution_id: data.institution_id,
        event_category_id: data.event_category_id,
        event_start_at: eventStartAt,
        event_end_at: eventEndAt,
        target_grade: data.target_grade,
        instructor_waiting_room: data.instructor_waiting_room,
        admin_contact: data.admin_contact,
        has_elevator: data.has_elevator,
        floor_map_url: floorMapUrl,
        laptop_wifi_note: data.laptop_wifi_note,
        crime_check_method: data.crime_check_method,
        crime_check_info: data.crime_check_info,
        indoor_shoes_note: data.indoor_shoes_note,
        parking_note: data.parking_note,
        student_rotation: data.student_rotation,
        notice: data.notice,
        prep_note: data.prep_note,
        memo: data.memo,
        school_request_note: data.school_request_note,
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
          id: u.rowId,
          occupation_program_unit_id: u.unitId,
          start_time: u.startTime || null,
          end_time: u.endTime || null,
          classroom: u.classroom || null,
          instructor_waiting_room: u.instructorWaitingRoom || null,
          target: u.target || null,
          lecture_fee: u.lectureFee,
          lecture_fee_after_tax: calcLectureFeeAfterTax(u.lectureFee),
          headcount: u.headcount,
          session_headcount: u.sessionHeadcount,
          school_request_response: u.schoolRequestResponse || null,
          remarks: u.remarks || null,
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
    <div className="p-8 max-w-7xl bg-gray-50 min-h-full">
      {/* 헤더 - 스크롤해도 항상 보이도록 상단에 고정 */}
      <div className="sticky top-0 z-10 bg-white flex items-center justify-between py-4 mb-8 shadow-[0_4px_12px_rgba(20,20,40,0.05)]">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{eventId ? '행사 수정' : '행사 등록'}</h1>
        <div className="flex gap-2">
          {eventId && (
            <button
              type="button"
              onClick={() => router.push(`/events/${eventId}/recruiting`)}
              className="px-4 py-2 text-sm border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors"
            >
              강사 섭외 바로가기
            </button>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isBusy}
            className="px-5 py-2 text-sm bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-[0_8px_20px_rgba(37,99,235,0.25)]"
          >
            {isBusy ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 items-start">
        {/* ── 왼쪽 표 ── */}
        <div className="min-w-0 overflow-x-auto">
        <table className={tableCls}>
          <tbody>
            <tr>
              <td className={cellLabelCls}>접수일</td>
              <td className={cellValueCls}>
                <input type="date" {...register('reception_date')} className={cellInputCls} />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>
                행사명 <span className="text-red-500">*</span>
              </td>
              <td className={cellValueCls}>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="예: 드림피아초등학교 1학기 직업체험"
                  className={cellInputCls}
                />
                {errors.name && <p className="mt-0.5 text-xs text-red-500">{errors.name.message}</p>}
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>행사구분</td>
              <td className={cellValueCls}>
                <input type="hidden" {...register('institution_id')} />
                <select
                  {...register('event_category_id', { setValueAs: (v) => v || null })}
                  className={cellSelectCls}
                >
                  <option value="">선택</option>
                  {eventCategories.map((ec) => (
                    <option key={ec.id} value={ec.id}>{ec.name}</option>
                  ))}
                </select>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>학교/기관명</td>
              <td className={`${cellValueCls} bg-gray-50 text-gray-500`}>
                {institution?.name ?? '-'}
                {institution?.is_deleted && <span className="ml-1 text-red-400">(삭제됨)</span>}
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>주소</td>
              <td className={`${cellValueCls} bg-gray-50 text-gray-500`}>{institution?.address ?? '-'}</td>
            </tr>

            <tr>
              <td className={cellLabelCls}>시작일시</td>
              <td className={cellValueCls}>
                <div className="grid grid-cols-[1.3fr_1fr] gap-1">
                  <input type="date" {...register('event_start_date')} className={`${cellInputCls} min-w-0`} />
                  <input type="time" {...register('event_start_at_time')} className={`${cellInputCls} min-w-0`} />
                </div>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>종료일시</td>
              <td className={cellValueCls}>
                <div className="grid grid-cols-[1.3fr_1fr] gap-1">
                  <input type="date" {...register('event_end_date')} className={`${cellInputCls} min-w-0`} />
                  <input type="time" {...register('event_end_at_time')} className={`${cellInputCls} min-w-0`} />
                </div>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>대상학년</td>
              <td className={cellValueCls}>
                <input type="text" {...register('target_grade')} placeholder="예: 1~3학년" className={cellInputCls} />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>강사대기실</td>
              <td className={cellValueCls}>
                <input
                  type="text"
                  {...register('instructor_waiting_room')}
                  placeholder="예: 2층 2학년 학년연구실"
                  className={cellInputCls}
                />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>계약담당 행정실 연락처</td>
              <td className={cellValueCls}>
                <input type="text" {...register('admin_contact')} placeholder="예: 051-123-4567" className={cellInputCls} />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>노트북/와이파이</td>
              <td className={cellValueCls}>
                <input type="text" {...register('laptop_wifi_note')} className={cellInputCls} />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>범죄경력 진행방식</td>
              <td className={cellValueCls}>
                <select
                  {...register('crime_check_method', { setValueAs: (v) => v || null })}
                  className={cellSelectCls}
                >
                  <option value="">선택</option>
                  {CRIME_CHECK_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>범죄경력회보서</td>
              <td className={cellValueCls}>
                <input
                  type="text"
                  {...register('crime_check_info')}
                  placeholder="기관아이디/검증번호"
                  className={cellInputCls}
                />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>실내화(내빈화)위치</td>
              <td className={cellValueCls}>
                <input type="text" {...register('indoor_shoes_note')} className={cellInputCls} />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>주차 및 엘리베이터</td>
              <td className={cellValueCls}>
                <input type="text" {...register('parking_note')} className={cellInputCls} />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>엘리베이터 유무</td>
              <td className={cellValueCls}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('has_elevator', true)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      watch('has_elevator') === true
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    있음
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('has_elevator', false)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      watch('has_elevator') === false
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    없음
                  </button>
                </div>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>학교 배치도</td>
              <td className={cellValueCls}>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={floorMapInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.hwp"
                    onChange={(e) => setFloorMapFile(e.target.files?.[0] ?? null)}
                  />
                  {watch('floor_map_url') && !floorMapFile && (
                    <a
                      href={watch('floor_map_url')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 underline whitespace-nowrap"
                    >
                      현재 파일 보기
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => floorMapInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    {watch('floor_map_url') || floorMapFile ? '재업로드' : '파일 선택'}
                  </button>
                  {floorMapFile && (
                    <span className="text-xs text-gray-500 truncate max-w-40">{floorMapFile.name}</span>
                  )}
                </div>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>학생변경 여부</td>
              <td className={cellValueCls}>
                <select
                  {...register('student_rotation', { setValueAs: (v) => v || null })}
                  className={cellSelectCls}
                >
                  <option value="">선택</option>
                  {STUDENT_ROTATIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>공지사항</td>
              <td className={cellValueCls}>
                <textarea
                  {...register('notice')}
                  rows={2}
                  className={`${cellInputCls} resize-none`}
                />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>준비사항(드림피아)</td>
              <td className={cellValueCls}>
                <textarea
                  {...register('prep_note')}
                  rows={2}
                  className={`${cellInputCls} resize-none`}
                />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>메모</td>
              <td className={cellValueCls}>
                <textarea
                  {...register('memo')}
                  rows={2}
                  className={`${cellInputCls} resize-none`}
                />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>학교요청사항(행사 전체)</td>
              <td className={cellValueCls}>
                <textarea
                  {...register('school_request_note')}
                  rows={2}
                  placeholder="이 행사 전체에 공통으로 적용되는 학교 요청사항"
                  className={`${cellInputCls} resize-none`}
                />
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        {/* ── 오른쪽 표 ── */}
        <div className="min-w-0 overflow-x-auto">
        <table className={tableCls}>
          <tbody>
            {[
              { label: '1교시', startKey: 'schedule_1_start', endKey: 'schedule_1_end' },
              { label: '2교시', startKey: 'schedule_2_start', endKey: 'schedule_2_end' },
              { label: '점심시간', startKey: 'schedule_lunch_start', endKey: 'schedule_lunch_end' },
            ].map(({ label, startKey, endKey }) => (
              <tr key={label}>
                <td className={cellLabelCls}>{label}</td>
                <td className={cellValueCls}>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-1 items-center">
                    <input
                      type="time"
                      {...register(startKey as keyof EventFormData)}
                      className={`${cellInputCls} min-w-0`}
                    />
                    <span className="text-gray-400 text-sm">~</span>
                    <input
                      type="time"
                      {...register(endKey as keyof EventFormData)}
                      className={`${cellInputCls} min-w-0`}
                    />
                  </div>
                </td>
              </tr>
            ))}

            <tr>
              <td className={cellLabelCls}>담당자 성함</td>
              <td className={cellValueCls}>
                <input
                  type="text"
                  {...register('contact_name')}
                  placeholder="예: 3학년 부장 홍길동"
                  className={cellInputCls}
                />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>담당자 이메일</td>
              <td className={cellValueCls}>
                <input type="email" {...register('contact_email')} className={cellInputCls} />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>담당자 연락처</td>
              <td className={cellValueCls}>
                <input type="tel" {...register('contact_phone')} className={cellInputCls} />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>유입경로</td>
              <td className={cellValueCls}>
                <select
                  {...register('inflow_source', { setValueAs: (v) => v || null })}
                  className={cellSelectCls}
                >
                  <option value="">선택</option>
                  {INFLOW_SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>기관</td>
              <td className={cellValueCls}>
                <select
                  {...register('institution_type', { setValueAs: (v) => v || null })}
                  className={cellSelectCls}
                >
                  <option value="">선택</option>
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>영업담당자</td>
              <td className={cellValueCls}>
                <select
                  {...register('sales_admin_id', { setValueAs: (v) => v || null })}
                  className={cellSelectCls}
                >
                  <option value="">선택</option>
                  {salesAdmins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>예산 (원)</td>
              <td className={cellValueCls}>
                <input
                  type="number"
                  {...register('budget', {
                    setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
                  })}
                  placeholder="예산을 입력하세요"
                  className={cellInputCls}
                  min={0}
                />
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>견적서</td>
              <td className={cellValueCls}>
                <input
                  type="file"
                  accept=".pdf,.hwp,.xlsx,.xls,.doc,.docx"
                  onChange={(e) => setEstimateFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border file:border-gray-300 file:text-xs file:bg-white file:text-gray-700 hover:file:bg-gray-50 cursor-pointer"
                />
                {estimateFile ? (
                  <p className="mt-0.5 text-xs text-gray-500">{estimateFile.name}</p>
                ) : (
                  initialEstimateFileUrl && (
                    <a
                      href={initialEstimateFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block text-xs text-primary-600 hover:underline"
                    >
                      현재 견적서 보기
                    </a>
                  )
                )}
              </td>
            </tr>

            <tr>
              <td className={cellLabelCls}>섭외시작일</td>
              <td className={`${cellValueCls} bg-gray-50 text-gray-400`}>섭외 시작 시 자동 등록</td>
            </tr>

            <tr>
              <td className={cellLabelCls}>소통담당자</td>
              <td className={cellValueCls}>
                <select
                  {...register('comm_admin_id', { setValueAs: (v) => v || null })}
                  className={cellSelectCls}
                >
                  <option value="">선택</option>
                  {commAdmins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <div className="mt-8">
        <EventProgramUnitSection
          eventCategoryId={watch('event_category_id') ?? null}
          fields={fields}
          occupations={occupations}
          programs={programs}
          units={units}
          mentorsByUnit={mentorsByUnit}
          value={programUnits}
          onChange={setProgramUnits}
          photosByRow={initialPhotosByRow}
          defaultStartTime={(() => {
            const d = watch('event_start_date'), t = watch('event_start_at_time')
            return d && t ? `${d}T${t}` : d ? `${d}T00:00` : ''
          })()}
          defaultEndTime={(() => {
            const d = watch('event_end_date'), t = watch('event_end_at_time')
            return d && t ? `${d}T${t}` : d ? `${d}T00:00` : ''
          })()}
        />
      </div>
    </div>
  )
}
