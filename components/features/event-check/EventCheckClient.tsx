'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  checkMentorAvailability,
  type CheckMentorAvailabilityResult,
  type EventCheckFormData,
} from '@/app/(dashboard)/event-check/actions'
import { AREA_OPTIONS } from '@/components/features/mentors/shared'
import { SCHOOL_LEVEL_OPTIONS } from '@/app/(dashboard)/programs/constants'

const rowCls = 'flex items-center gap-3'
const labelCls = 'w-28 shrink-0 text-sm font-medium text-gray-700'
const inputCls =
  'flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-sm outline-none focus:border-primary-400 transition-colors'
const selectCls =
  'flex-1 px-3 py-1.5 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 outline-none focus:border-primary-400 transition-colors'

export function EventCheckClient({ formData }: { formData: EventCheckFormData }) {
  const { units, programs, occupations } = formData

  const programMap = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const occupationMap = useMemo(() => new Map(occupations.map((o) => [o.id, o])), [occupations])

  const schoolLevels = SCHOOL_LEVEL_OPTIONS

  const [schoolLevel, setSchoolLevel] = useState('')
  const [unitId, setUnitId] = useState('')
  const [area, setArea] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [requiredCount, setRequiredCount] = useState(1)

  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<CheckMentorAvailabilityResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const unitsForLevel = useMemo(
    () => units.filter((u) => u.school_level === schoolLevel),
    [units, schoolLevel]
  )

  // 직종별로 묶어서 optgroup으로 표시
  const groupedUnits = useMemo(() => {
    const groups = new Map<string, { label: string; unitList: typeof unitsForLevel }>()
    for (const unit of unitsForLevel) {
      const program = unit.occupation_programs_id ? programMap.get(unit.occupation_programs_id) : null
      const occupation = program?.occupation_id ? occupationMap.get(program.occupation_id) : null
      const key = occupation?.id ?? 'unknown'
      const label = occupation?.name ?? '기타'
      const group = groups.get(key) ?? { label, unitList: [] }
      group.unitList.push(unit)
      groups.set(key, group)
    }
    return [...groups.values()]
  }, [unitsForLevel, programMap, occupationMap])

  const handleSchoolLevelChange = (value: string) => {
    setSchoolLevel(value)
    setUnitId('')
    setResult(null)
  }

  const canSubmit =
    schoolLevel !== '' && unitId !== '' && area !== '' && date !== '' && startTime !== '' && endTime !== '' && requiredCount > 0

  const onSubmit = () => {
    setErrorMessage(null)
    if (endTime <= startTime) {
      setErrorMessage('종료시간은 시작시간보다 이후여야 합니다.')
      return
    }
    startTransition(async () => {
      try {
        const res = await checkMentorAvailability({
          occupationProgramUnitId: unitId,
          area,
          date,
          startTime,
          endTime,
          requiredCount,
        })
        setResult(res)
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : '가용 여부 확인 중 오류가 발생했습니다.')
      }
    })
  }

  return (
    <div className="p-8 max-w-3xl bg-gray-50 min-h-full">
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-8">일자별 행사 진행 여부</h1>

      <div className="space-y-3 bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] p-6">
        <div className={rowCls}>
          <label className={labelCls}>교급</label>
          <select className={selectCls} value={schoolLevel} onChange={(e) => handleSchoolLevelChange(e.target.value)}>
            <option value="">선택</option>
            {schoolLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div className={rowCls}>
          <label className={labelCls}>프로그램</label>
          <select
            className={selectCls}
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            disabled={!schoolLevel}
          >
            <option value="">선택</option>
            {groupedUnits.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.unitList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className={rowCls}>
          <label className={labelCls}>지역</label>
          <select className={selectCls} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">선택</option>
            {AREA_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className={rowCls}>
          <label className={labelCls}>날짜</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className={rowCls}>
          <label className={labelCls}>시작 ~ 종료시간</label>
          <div className="flex-1 flex gap-2">
            <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className={rowCls}>
          <label className={labelCls}>신청멘토수</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={requiredCount}
            onChange={(e) => setRequiredCount(Number(e.target.value))}
          />
        </div>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        <div className="pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || isPending}
            className="px-5 py-2 text-sm bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-[0_8px_20px_rgba(37,99,235,0.25)]"
          >
            {isPending ? '확인 중...' : '가용 여부 확인'}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-6 bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                result.canProceed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {result.canProceed ? '진행가능' : '진행불가'}
            </span>
            <span className="text-sm text-gray-600">
              가용 {result.availableCount}명 / 신청 {result.requiredCount}명
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">가용 멘토 명단 ({result.availableMentors.length}명)</p>
            {result.availableMentors.length > 0 ? (
              <ul className="text-sm text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                {result.availableMentors.map((m) => (
                  <li key={m.id}>{m.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">가용한 멘토가 없습니다.</p>
            )}
          </div>

          {result.unavailableMentors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                불가 멘토 (해당 시간대 일정 있음, {result.unavailableMentors.length}명)
              </p>
              <ul className="text-sm text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                {result.unavailableMentors.map((m) => (
                  <li key={m.id}>{m.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
