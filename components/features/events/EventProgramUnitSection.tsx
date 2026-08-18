'use client'

import { useMemo, useState } from 'react'
import { generateId } from '@/lib/generate-id'
import { formatScoreWithGrade } from '@/lib/mentor-grade'

export type EventCategoryOption = { id: string; name: string }
export type FieldOption = { id: string; name: string; event_category_id: string | null }
export type OccupationOption = { id: string; name: string; field_id: string | null }
export type ProgramOption = { id: string; name: string; occupation_id: string | null }
export type UnitOption = {
  id: string
  title: string
  occupation_programs_id: string | null
  school_request_note: string | null
  final_product_available: boolean | null
  is_delivery_available: boolean | null
  mentor_material_cost: number | null
  dreampia_material_cost: number | null
}
export type MentorOption = {
  id: string
  name: string
  score: number | null
  belongsToName: string | null
  schoolRequestNote: string | null
  lectureFeePayerName: string | null
  materialFeePayerName: string | null
}
export type ProgramUnitPhoto = { id: string; url: string }

export type SelectedProgramUnit = {
  key: string
  rowId: string | null
  unitId: string
  title: string
  fieldName: string
  occupationName: string
  programName: string
  schoolRequestNote: string | null
  schoolRequestResponse: string
  finalProductAvailable: boolean | null
  isDeliveryAvailable: boolean | null
  mentorMaterialCost: number | null
  dreampiaMaterialCost: number | null
  startTime: string
  endTime: string
  classroom: string
  instructorWaitingRoom: string
  target: string
  lectureFee: number | null
  headcount: number | null
  sessionHeadcount: number | null
  mentorId: string | null
  remarks: string
  attendance: boolean | null
}

// 강사료 3.3% 원천징수 후 세후 강의료
export function calcLectureFeeAfterTax(lectureFee: number | null): number | null {
  if (lectureFee === null || Number.isNaN(lectureFee)) return null
  return Math.round(lectureFee * (1 - 0.033))
}

// 유닛 -> 프로그램 -> 직종 -> 분야 경로를 조회 (기존에 저장된 행사 프로그램을 폼에 복원할 때 사용)
export function buildUnitPath(
  unit: UnitOption,
  programs: ProgramOption[],
  occupations: OccupationOption[],
  fields: FieldOption[]
) {
  const program = unit.occupation_programs_id
    ? programs.find((p) => p.id === unit.occupation_programs_id)
    : undefined
  const occupation = program?.occupation_id
    ? occupations.find((o) => o.id === program.occupation_id)
    : undefined
  const field = occupation?.field_id ? fields.find((f) => f.id === occupation.field_id) : undefined
  return {
    fieldName: field?.name ?? '-',
    occupationName: occupation?.name ?? '-',
    programName: program?.name ?? '-',
  }
}

const selCls =
  'border border-gray-300 rounded-xl px-2 py-1.5 text-sm bg-white outline-none focus:border-primary-400 disabled:bg-gray-50 disabled:text-gray-400'
const fieldInputCls =
  'w-full border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:border-primary-400'

// startTime/endTime은 "YYYY-MM-DDTHH:mm" 형태로 그대로 저장하되, 입력은
// 일자 하나 + 시작/종료 시간 두 개로 나눠 받기 위한 변환 헬퍼.
function splitDateTime(value: string): { date: string; time: string } {
  const [date, time] = value.split('T')
  return { date: date ?? '', time: time ?? '' }
}
function joinDateTime(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '00:00'}`
}

// 검색 또는 분야 > 직종 > 프로그램 > 프로그램 유닛 드릴다운으로 occupation_program_unit을 찾아 추가하는 섹션.
// 행사구분은 행사 등록 폼 상단에서 한 번만 선택하므로, 여기서는 그 값을 eventCategoryId prop으로
// 전달받아 분야 목록을 필터링하는 데만 사용한다(이 섹션 안에서 다시 선택하지 않는다).
export function EventProgramUnitSection({
  eventCategoryId,
  fields,
  occupations,
  programs,
  units,
  mentorsByUnit,
  value,
  onChange,
  defaultStartTime,
  defaultEndTime,
  photosByRow = {},
}: {
  eventCategoryId: string | null
  fields: FieldOption[]
  occupations: OccupationOption[]
  programs: ProgramOption[]
  units: UnitOption[]
  mentorsByUnit: Record<string, MentorOption[]>
  value: SelectedProgramUnit[]
  onChange: (next: SelectedProgramUnit[]) => void
  defaultStartTime?: string
  defaultEndTime?: string
  photosByRow?: Record<string, ProgramUnitPhoto[]>
}) {
  const [search, setSearch] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [occupationId, setOccupationId] = useState('')
  const [programId, setProgramId] = useState('')
  const [unitId, setUnitId] = useState('')

  // 일괄 적용 (대상 / 강의료 / 일자·시작·종료 시간을 추가된 모든 행에 한 번에 반영)
  const [bulkTarget, setBulkTarget] = useState('')
  const [bulkLectureFee, setBulkLectureFee] = useState<number | null>(null)
  const [bulkDate, setBulkDate] = useState('')
  const [bulkStartTime, setBulkStartTime] = useState('')
  const [bulkEndTime, setBulkEndTime] = useState('')

  const occupationMap = useMemo(() => new Map(occupations.map((o) => [o.id, o])), [occupations])
  const programMap = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields])

  const buildPath = (unit: UnitOption) => {
    const program = unit.occupation_programs_id ? programMap.get(unit.occupation_programs_id) : undefined
    const occupation = program?.occupation_id ? occupationMap.get(program.occupation_id) : undefined
    const field = occupation?.field_id ? fieldMap.get(occupation.field_id) : undefined
    return {
      fieldName: field?.name ?? '-',
      occupationName: occupation?.name ?? '-',
      programName: program?.name ?? '-',
    }
  }

  const searchResults = useMemo(() => {
    const q = search.trim()
    if (!q) return []
    return units.filter((u) => u.title.includes(q)).slice(0, 8)
  }, [units, search])

  const filteredFields = useMemo(
    () => (eventCategoryId ? fields.filter((f) => f.event_category_id === eventCategoryId) : []),
    [fields, eventCategoryId]
  )
  const filteredOccupations = useMemo(
    () => occupations.filter((o) => o.field_id === fieldId),
    [occupations, fieldId]
  )
  const filteredPrograms = useMemo(
    () => programs.filter((p) => p.occupation_id === occupationId),
    [programs, occupationId]
  )
  const filteredUnits = useMemo(
    () => units.filter((u) => u.occupation_programs_id === programId),
    [units, programId]
  )

  // 동일한 프로그램 유닛을 여러 일정(예: 같은 프로그램을 여러 날짜에 진행)으로 중복 추가할 수 있어야 하므로
  // unitId가 아닌 별도의 key로 각 행을 구분한다.
  const addUnit = (unit: UnitOption) => {
    onChange([
      ...value,
      {
        key: generateId(),
        rowId: null,
        unitId: unit.id,
        title: unit.title,
        ...buildPath(unit),
        schoolRequestNote: unit.school_request_note,
        schoolRequestResponse: '',
        finalProductAvailable: unit.final_product_available,
        isDeliveryAvailable: unit.is_delivery_available,
        mentorMaterialCost: unit.mentor_material_cost,
        dreampiaMaterialCost: unit.dreampia_material_cost,
        startTime: defaultStartTime ?? '',
        endTime: defaultEndTime ?? '',
        classroom: '',
        instructorWaitingRoom: '',
        target: '',
        lectureFee: null,
        headcount: null,
        sessionHeadcount: null,
        mentorId: null,
        remarks: '',
        attendance: null,
      },
    ])
  }

  const handleAddFromDropdown = () => {
    const unit = units.find((u) => u.id === unitId)
    if (!unit) return
    addUnit(unit)
    setUnitId('')
  }

  const removeUnit = (key: string) => {
    onChange(value.filter((v) => v.key !== key))
  }

  const updateUnit = (key: string, patch: Partial<SelectedProgramUnit>) => {
    onChange(value.map((v) => (v.key === key ? { ...v, ...patch } : v)))
  }

  const applyBulkTarget = () => {
    if (!bulkTarget) return
    onChange(value.map((v) => ({ ...v, target: bulkTarget })))
  }

  const applyBulkLectureFee = () => {
    if (bulkLectureFee === null) return
    onChange(value.map((v) => ({ ...v, lectureFee: bulkLectureFee })))
  }

  const applyBulkTime = () => {
    if (!bulkDate && !bulkStartTime && !bulkEndTime) return
    onChange(
      value.map((v) => {
        const st = splitDateTime(v.startTime)
        const et = splitDateTime(v.endTime)
        const date = bulkDate || st.date || et.date
        return {
          ...v,
          startTime: joinDateTime(date, bulkStartTime || st.time),
          endTime: joinDateTime(date, bulkEndTime || et.time),
        }
      })
    )
  }

  const updateRowDate = (v: SelectedProgramUnit, date: string) => {
    const st = splitDateTime(v.startTime)
    const et = splitDateTime(v.endTime)
    updateUnit(v.key, { startTime: joinDateTime(date, st.time), endTime: joinDateTime(date, et.time) })
  }
  const updateRowStartTime = (v: SelectedProgramUnit, time: string) => {
    const st = splitDateTime(v.startTime)
    const date = st.date || splitDateTime(v.endTime).date
    updateUnit(v.key, { startTime: joinDateTime(date, time) })
  }
  const updateRowEndTime = (v: SelectedProgramUnit, time: string) => {
    const et = splitDateTime(v.endTime)
    const date = et.date || splitDateTime(v.startTime).date
    updateUnit(v.key, { endTime: joinDateTime(date, time) })
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">프로그램 추가</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          여기서는 프로그램 유닛 추가까지만 진행합니다. 강사 배정은 저장 후 강사 섭외 페이지에서 진행됩니다.
        </p>
      </div>

      {/* 검색 */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="프로그램 유닛명 검색"
          className="w-full px-3 py-1.5 border border-gray-300 rounded-full text-sm outline-none focus:border-primary-400 transition-colors"
        />
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-[0_20px_50px_rgba(20,20,40,0.15)] z-20 max-h-52 overflow-y-auto overflow-x-hidden">
            {searchResults.map((u) => {
              const path = buildPath(u)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    addUnit(u)
                    setSearch('')
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-800">{u.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {path.fieldName} &gt; {path.occupationName} &gt; {path.programName}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">
        또는 분야 &gt; 직종 &gt; 프로그램 &gt; 프로그램 유닛 순으로 선택
        {!eventCategoryId && (
          <span className="text-red-400"> (상단에서 행사구분을 먼저 선택해주세요)</span>
        )}
      </div>

      {/* 드릴다운 */}
      <div className="flex items-center gap-2">
        <select
          className={`${selCls} flex-1`}
          value={fieldId}
          disabled={!eventCategoryId}
          onChange={(e) => {
            setFieldId(e.target.value)
            setOccupationId('')
            setProgramId('')
            setUnitId('')
          }}
        >
          <option value="">분야</option>
          {filteredFields.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          className={`${selCls} flex-1`}
          value={occupationId}
          disabled={!fieldId}
          onChange={(e) => {
            setOccupationId(e.target.value)
            setProgramId('')
            setUnitId('')
          }}
        >
          <option value="">직종</option>
          {filteredOccupations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          className={`${selCls} flex-1`}
          value={programId}
          disabled={!occupationId}
          onChange={(e) => {
            setProgramId(e.target.value)
            setUnitId('')
          }}
        >
          <option value="">프로그램</option>
          {filteredPrograms.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className={`${selCls} flex-1`}
          value={unitId}
          disabled={!programId}
          onChange={(e) => setUnitId(e.target.value)}
        >
          <option value="">프로그램 유닛</option>
          {filteredUnits.map((u) => (
            <option key={u.id} value={u.id}>{u.title}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!unitId}
          onClick={handleAddFromDropdown}
          className="px-3 py-1.5 text-xs bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          추가
        </button>
      </div>

      {/* 일괄 적용 */}
      {value.length > 0 && (
        <div className="border border-primary-100 rounded-2xl p-3 space-y-2 bg-primary-50/40">
          <p className="text-xs font-medium text-gray-600">
            일괄 적용 <span className="text-gray-400 font-normal">(추가된 모든 프로그램에 값을 한 번에 적용합니다)</span>
          </p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
              className={`${fieldInputCls} w-auto`}
            />
            <input
              type="time"
              value={bulkStartTime}
              onChange={(e) => setBulkStartTime(e.target.value)}
              className={`${fieldInputCls} w-auto`}
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="time"
              value={bulkEndTime}
              onChange={(e) => setBulkEndTime(e.target.value)}
              className={`${fieldInputCls} w-auto`}
            />
            <button
              type="button"
              onClick={applyBulkTime}
              disabled={!bulkDate && !bulkStartTime && !bulkEndTime}
              className="px-3 py-1.5 text-xs border border-primary-300 text-primary-600 rounded-full bg-white hover:bg-primary-50 disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400 transition-colors whitespace-nowrap"
            >
              전체 적용
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={bulkTarget}
              onChange={(e) => setBulkTarget(e.target.value)}
              placeholder="대상 (예: 1학년)"
              className={`${fieldInputCls} max-w-50`}
            />
            <button
              type="button"
              onClick={applyBulkTarget}
              disabled={!bulkTarget}
              className="px-3 py-1.5 text-xs border border-primary-300 text-primary-600 rounded-full bg-white hover:bg-primary-50 disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400 transition-colors whitespace-nowrap"
            >
              전체 적용
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={bulkLectureFee ?? ''}
              onChange={(e) => setBulkLectureFee(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="강의료"
              min={0}
              className={`${fieldInputCls} max-w-50`}
            />
            <button
              type="button"
              onClick={applyBulkLectureFee}
              disabled={bulkLectureFee === null}
              className="px-3 py-1.5 text-xs border border-primary-300 text-primary-600 rounded-full bg-white hover:bg-primary-50 disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400 transition-colors whitespace-nowrap"
            >
              전체 적용
            </button>
          </div>
        </div>
      )}

      {/* 추가된 프로그램 목록 - 엑셀 시트처럼 프로그램 1개당 1행 */}
      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] overflow-x-auto">
        <table className="text-sm border-collapse" style={{ minWidth: '3520px' }}>
          <thead>
            <tr className="bg-primary-50 border-b border-primary-100">
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-36 min-w-36">일자</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-24 min-w-24">시작 시간</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-24 min-w-24">종료 시간</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-36 min-w-36">대상</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-32 min-w-32">요청직업군</th>
              <th className="px-2 py-2 text-left font-bold text-primary-700 w-56 min-w-56">프로그램</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-40 min-w-40">강사 배정</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-32 min-w-32">강의실</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-32 min-w-32">대기실</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-20 min-w-20">출석</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-32 min-w-32">강의료</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-28 min-w-28">강의료 입금자명</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-36 min-w-36 whitespace-nowrap">1인당 강사 재료비</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-40 min-w-40 whitespace-nowrap">1인당 드림피아 재료비</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-24 min-w-24">인원수</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-24 min-w-24">차시별 인원수</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-28 min-w-28">재료비 입금자명</th>
              <th className="px-2 py-2 text-left font-bold text-primary-700 w-48 min-w-48">학교요청사항</th>
              <th className="px-2 py-2 text-left font-bold text-primary-700 w-56 min-w-56">답변</th>
              <th className="px-2 py-2 text-left font-bold text-primary-700 w-40 min-w-40">비고</th>
              <th className="px-2 py-2 text-left font-bold text-primary-700 w-40 min-w-40">사진</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-28 min-w-28">강사등급</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-32 min-w-32">소속구분</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-28 min-w-28">완성품 제공</th>
              <th className="px-2 py-2 text-center font-bold text-primary-700 w-24 min-w-24">택배 가능</th>
              <th className="px-2 py-2 w-16 min-w-16" />
            </tr>
          </thead>
          <tbody>
            {value.length === 0 ? (
              <tr>
                <td colSpan={26} className="py-6 text-center text-xs text-gray-400">
                  추가된 프로그램이 없습니다.
                </td>
              </tr>
            ) : (
              value.map((v) => {
                const candidateMentors = mentorsByUnit[v.unitId] ?? []
                const assignedMentor = v.mentorId
                  ? candidateMentors.find((m) => m.id === v.mentorId)
                  : undefined
                return (
                  <tr key={v.key} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={splitDateTime(v.startTime).date || splitDateTime(v.endTime).date}
                        onChange={(e) => updateRowDate(v, e.target.value)}
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="time"
                        value={splitDateTime(v.startTime).time}
                        onChange={(e) => updateRowStartTime(v, e.target.value)}
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="time"
                        value={splitDateTime(v.endTime).time}
                        onChange={(e) => updateRowEndTime(v, e.target.value)}
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={v.target}
                        onChange={(e) => updateUnit(v.key, { target: e.target.value })}
                        placeholder="1학년"
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">{v.occupationName}</td>
                    <td className="px-2 py-1.5 align-top">
                      <div className="font-medium text-gray-800">{v.title}</div>
                      <div className="text-xs text-gray-400">
                        {v.fieldName} &gt; {v.programName}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {assignedMentor ? assignedMentor.name : '미배정'}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={v.classroom}
                        onChange={(e) => updateUnit(v.key, { classroom: e.target.value })}
                        placeholder="예: 1-1반"
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={v.instructorWaitingRoom}
                        onChange={(e) => updateUnit(v.key, { instructorWaitingRoom: e.target.value })}
                        placeholder="예: 2층 2학년 학년연구실"
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {v.attendance === true ? '출석' : v.attendance === false ? '미출석' : '-'}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={v.lectureFee ?? ''}
                        onChange={(e) =>
                          updateUnit(v.key, { lectureFee: e.target.value === '' ? null : Number(e.target.value) })
                        }
                        min={0}
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {assignedMentor ? (assignedMentor.lectureFeePayerName ?? '-') : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {v.mentorMaterialCost != null ? v.mentorMaterialCost.toLocaleString() : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {v.dreampiaMaterialCost != null ? v.dreampiaMaterialCost.toLocaleString() : '-'}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={v.headcount ?? ''}
                        onChange={(e) =>
                          updateUnit(v.key, { headcount: e.target.value === '' ? null : Number(e.target.value) })
                        }
                        min={0}
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={v.sessionHeadcount ?? ''}
                        onChange={(e) =>
                          updateUnit(v.key, {
                            sessionHeadcount: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        min={0}
                        className={fieldInputCls}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {assignedMentor ? (assignedMentor.materialFeePayerName ?? '-') : '-'}
                    </td>
                    <td className="px-2 py-1.5 align-top text-xs text-gray-600 whitespace-pre-wrap">
                      {v.schoolRequestNote && <div>{v.schoolRequestNote}</div>}
                      {assignedMentor?.schoolRequestNote && (
                        <div className="text-gray-400">(강사) {assignedMentor.schoolRequestNote}</div>
                      )}
                      {!v.schoolRequestNote && !assignedMentor?.schoolRequestNote && (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <textarea
                        value={v.schoolRequestResponse}
                        onChange={(e) => updateUnit(v.key, { schoolRequestResponse: e.target.value })}
                        placeholder="학교(기관) 답변 기록"
                        rows={2}
                        className={`${fieldInputCls} resize-none`}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <textarea
                        value={v.remarks}
                        onChange={(e) => updateUnit(v.key, { remarks: e.target.value })}
                        placeholder="비고"
                        rows={2}
                        className={`${fieldInputCls} resize-none`}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-top text-xs">
                      {!v.rowId ? (
                        <span className="text-gray-300">저장 후 확인 가능</span>
                      ) : (photosByRow[v.rowId] ?? []).length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {(photosByRow[v.rowId] ?? []).map((photo, i) => (
                            <a
                              key={photo.id}
                              href={photo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 underline underline-offset-2 hover:text-primary-700"
                            >
                              사진{i + 1}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {assignedMentor ? formatScoreWithGrade(assignedMentor.score) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {assignedMentor ? (assignedMentor.belongsToName ?? '개인') : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {v.finalProductAvailable ? '가능' : '불가'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs text-gray-600">
                      {v.isDeliveryAvailable ? '가능' : '불가'}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeUnit(v.key)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
