'use client'

import { useMemo, useState } from 'react'

export type FieldOption = { id: string; name: string }
export type OccupationOption = { id: string; name: string; field_id: string | null }
export type ProgramOption = { id: string; name: string; occupation_id: string | null }
export type UnitOption = { id: string; title: string; occupation_programs_id: string | null }

export type SelectedProgramUnit = {
  unitId: string
  title: string
  fieldName: string
  occupationName: string
  programName: string
}

const selCls =
  'border border-gray-300 rounded px-2 py-1.5 text-sm bg-white outline-none focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400'

// 검색 또는 분야 > 직종 > 프로그램 > 프로그램 유닛 드릴다운으로 occupation_program_unit을 찾아 추가하는 섹션.
export function EventProgramUnitSection({
  fields,
  occupations,
  programs,
  units,
  value,
  onChange,
}: {
  fields: FieldOption[]
  occupations: OccupationOption[]
  programs: ProgramOption[]
  units: UnitOption[]
  value: SelectedProgramUnit[]
  onChange: (next: SelectedProgramUnit[]) => void
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
    onChange([...value, { unitId: unit.id, title: unit.title, ...buildPath(unit) }])
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
      <div className="space-y-1">
        {value.length === 0 ? (
          <p className="text-xs text-gray-400">추가된 프로그램이 없습니다.</p>
        ) : (
          value.map((v) => (
            <div
              key={v.unitId}
              className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded text-sm"
            >
              <div>
                <span className="font-medium text-gray-800">{v.title}</span>
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
          ))
        )}
      </div>
    </div>
  )
}
