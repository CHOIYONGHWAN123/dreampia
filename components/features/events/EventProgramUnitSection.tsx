'use client'

import { useMemo, useState } from 'react'

export type FieldOption = { id: string; name: string }
export type OccupationOption = { id: string; name: string; field_id: string | null }
export type ProgramOption = { id: string; name: string; occupation_id: string | null }
export type UnitOption = { id: string; title: string; occupation_programs_id: string | null }
export type MentorOption = { id: string; name: string; score: number | null; belongsToName: string | null }

export type SelectedProgramUnit = {
  unitId: string
  title: string
  fieldName: string
  occupationName: string
  programName: string
  startTime: string
  endTime: string
  classroom: string
  target: string
  lectureFee: number | null
  headcount: number | null
  sessionHeadcount: number | null
  mentorId: string | null
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
  'border border-gray-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400'
const fieldInputCls =
  'w-full border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:border-gray-500'

// 검색 또는 분야 > 직종 > 프로그램 > 프로그램 유닛 드릴다운으로 occupation_program_unit을 찾아 추가하는 섹션.
export function EventProgramUnitSection({
  fields,
  occupations,
  programs,
  units,
  mentorsByUnit,
  value,
  onChange,
  defaultStartTime,
  defaultEndTime,
}: {
  fields: FieldOption[]
  occupations: OccupationOption[]
  programs: ProgramOption[]
  units: UnitOption[]
  mentorsByUnit: Record<string, MentorOption[]>
  value: SelectedProgramUnit[]
  onChange: (next: SelectedProgramUnit[]) => void
  defaultStartTime?: string
  defaultEndTime?: string
}) {
  const [search, setSearch] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [occupationId, setOccupationId] = useState('')
  const [programId, setProgramId] = useState('')
  const [unitId, setUnitId] = useState('')

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

  const addUnit = (unit: UnitOption) => {
    if (value.some((v) => v.unitId === unit.id)) return
    onChange([
      ...value,
      {
        unitId: unit.id,
        title: unit.title,
        ...buildPath(unit),
        startTime: defaultStartTime ?? '',
        endTime: defaultEndTime ?? '',
        classroom: '',
        target: '',
        lectureFee: null,
        headcount: null,
        sessionHeadcount: null,
        mentorId: null,
      },
    ])
  }

  const handleAddFromDropdown = () => {
    const unit = units.find((u) => u.id === unitId)
    if (!unit) return
    addUnit(unit)
    setUnitId('')
  }

  const removeUnit = (id: string) => {
    onChange(value.filter((v) => v.unitId !== id))
  }

  const updateUnit = (id: string, patch: Partial<SelectedProgramUnit>) => {
    onChange(value.map((v) => (v.unitId === id ? { ...v, ...patch } : v)))
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">프로그램 추가</h3>

      {/* 검색 */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="프로그램 유닛명 검색"
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:border-gray-500 transition-colors"
        />
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto">
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

      <div className="text-xs text-gray-400">또는 분야 &gt; 직종 &gt; 프로그램 &gt; 프로그램 유닛 순으로 선택</div>

      {/* 드릴다운 */}
      <div className="flex items-center gap-2">
        <select
          className={`${selCls} flex-1`}
          value={fieldId}
          onChange={(e) => {
            setFieldId(e.target.value)
            setOccupationId('')
            setProgramId('')
            setUnitId('')
          }}
        >
          <option value="">분야</option>
          {fields.map((f) => (
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
          className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          추가
        </button>
      </div>

      {/* 추가된 프로그램 목록 */}
      <div className="space-y-2">
        {value.length === 0 ? (
          <p className="text-xs text-gray-400">추가된 프로그램이 없습니다.</p>
        ) : (
          value.map((v) => {
            const lectureFeeAfterTax = calcLectureFeeAfterTax(v.lectureFee)
            const candidateMentors = mentorsByUnit[v.unitId] ?? []
            return (
              <div key={v.unitId} className="border border-gray-200 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-800 text-sm">{v.title}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {v.fieldName} &gt; {v.occupationName} &gt; {v.programName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUnit(v.unitId)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">강사 선택</label>
                  <select
                    value={v.mentorId ?? ''}
                    onChange={(e) => updateUnit(v.unitId, { mentorId: e.target.value || null })}
                    className={fieldInputCls}
                  >
                    <option value="">선택안함</option>
                    {candidateMentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (점수: {m.score ?? '-'} / 소속: {m.belongsToName ?? '개인'})
                      </option>
                    ))}
                  </select>
                  {candidateMentors.length === 0 && (
                    <p className="mt-0.5 text-xs text-gray-400">이 프로그램에 배정 가능한 강사가 없습니다.</p>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">시작 일시</label>
                    <input
                      type="datetime-local"
                      value={v.startTime}
                      onChange={(e) => updateUnit(v.unitId, { startTime: e.target.value })}
                      className={fieldInputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">종료 일시</label>
                    <input
                      type="datetime-local"
                      value={v.endTime}
                      onChange={(e) => updateUnit(v.unitId, { endTime: e.target.value })}
                      className={fieldInputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">강의실</label>
                    <input
                      type="text"
                      value={v.classroom}
                      onChange={(e) => updateUnit(v.unitId, { classroom: e.target.value })}
                      placeholder="예: 1-1반"
                      className={fieldInputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">대상</label>
                    <input
                      type="text"
                      value={v.target}
                      onChange={(e) => updateUnit(v.unitId, { target: e.target.value })}
                      placeholder="예: 1학년, 2학년, 3학년"
                      className={fieldInputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">강의료</label>
                    <input
                      type="number"
                      value={v.lectureFee ?? ''}
                      onChange={(e) =>
                        updateUnit(v.unitId, { lectureFee: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      min={0}
                      className={fieldInputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">강의료(세후)</label>
                    <input
                      type="text"
                      value={lectureFeeAfterTax !== null ? lectureFeeAfterTax.toLocaleString() : ''}
                      readOnly
                      placeholder="자동 계산(3.3% 제외)"
                      className={`${fieldInputCls} bg-gray-50 text-gray-500`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">인원수</label>
                    <input
                      type="number"
                      value={v.headcount ?? ''}
                      onChange={(e) =>
                        updateUnit(v.unitId, { headcount: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      min={0}
                      className={fieldInputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">차시별 인원수</label>
                    <input
                      type="number"
                      value={v.sessionHeadcount ?? ''}
                      onChange={(e) =>
                        updateUnit(v.unitId, {
                          sessionHeadcount: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      min={0}
                      className={fieldInputCls}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
