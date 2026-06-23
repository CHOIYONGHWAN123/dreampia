'use client'

import { useMemo } from 'react'

export interface ProgramLevelSelection {
  schoolLevel: string
  unitId: string
}

export interface ProgramSelectionValue {
  occupationProgramId: string
  levels: ProgramLevelSelection[]
}

export interface ProgramOption {
  id: string
  name: string
}

export interface UnitOption {
  id: string
  title: string
  occupation_programs_id: string | null
  program_category_id: string | null
}

export interface ProgramCategoryOption {
  id: string
  school_level: string | null
  experience_type: string
}

const selCls =
  'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400'

// 분야 → 직종까지 선택된 상태에서, 프로그램 → 교급(다중선택) → 교급별 유닛을 고르는 공용 피커.
// 교급을 체크하면 그 교급에 해당하는 유닛 선택지가 나타나고, 선택을 해제하면 사라진다.
export function ProgramUnitPicker({
  programs,
  units,
  programCategories,
  excludedUnitIds,
  value,
  onChange,
}: {
  programs: ProgramOption[]
  units: UnitOption[]
  programCategories: ProgramCategoryOption[]
  excludedUnitIds?: Set<string>
  value: ProgramSelectionValue
  onChange: (value: ProgramSelectionValue) => void
}) {
  const categoryMap = useMemo(() => new Map(programCategories.map((c) => [c.id, c])), [programCategories])

  const unitsForProgram = useMemo(
    () => units.filter((u) => u.occupation_programs_id === value.occupationProgramId),
    [units, value.occupationProgramId]
  )

  const levelToUnits = useMemo(() => {
    const map = new Map<string, UnitOption[]>()
    for (const unit of unitsForProgram) {
      const level = unit.program_category_id ? categoryMap.get(unit.program_category_id)?.school_level : null
      if (!level) continue
      const arr = map.get(level) ?? []
      arr.push(unit)
      map.set(level, arr)
    }
    return map
  }, [unitsForProgram, categoryMap])

  const availableLevels = useMemo(() => [...levelToUnits.keys()], [levelToUnits])

  const handleProgramChange = (occupationProgramId: string) => {
    onChange({ occupationProgramId, levels: [] })
  }

  const toggleLevel = (level: string) => {
    const exists = value.levels.some((l) => l.schoolLevel === level)
    if (exists) {
      onChange({ ...value, levels: value.levels.filter((l) => l.schoolLevel !== level) })
      return
    }
    const candidates = (levelToUnits.get(level) ?? []).filter((u) => !excludedUnitIds?.has(u.id))
    onChange({ ...value, levels: [...value.levels, { schoolLevel: level, unitId: candidates[0]?.id ?? '' }] })
  }

  const changeUnitForLevel = (level: string, unitId: string) => {
    onChange({
      ...value,
      levels: value.levels.map((l) => (l.schoolLevel === level ? { ...l, unitId } : l)),
    })
  }

  return (
    <div className="space-y-2">
      <select
        className={selCls}
        value={value.occupationProgramId}
        onChange={(e) => handleProgramChange(e.target.value)}
      >
        <option value="">프로그램 선택</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {value.occupationProgramId && (
        <div className="flex flex-wrap gap-1">
          {availableLevels.length > 0 ? (
            availableLevels.map((level) => {
              const checked = value.levels.some((l) => l.schoolLevel === level)
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleLevel(level)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    checked
                      ? 'bg-blue-100 text-blue-700 border-blue-300 font-medium'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {level}
                </button>
              )
            })
          ) : (
            <span className="text-xs text-gray-400">등록된 프로그램 유닛이 없습니다.</span>
          )}
        </div>
      )}

      {value.levels.map((levelSelection) => {
        const candidates = (levelToUnits.get(levelSelection.schoolLevel) ?? []).filter(
          (u) => !excludedUnitIds?.has(u.id) || u.id === levelSelection.unitId
        )
        return (
          <div key={levelSelection.schoolLevel} className="flex items-center gap-2 pl-2 border-l-2 border-blue-100">
            <span className="text-xs text-gray-500 w-12 shrink-0">{levelSelection.schoolLevel}</span>
            <select
              className={`${selCls} flex-1 min-w-0`}
              value={levelSelection.unitId}
              onChange={(e) => changeUnitForLevel(levelSelection.schoolLevel, e.target.value)}
            >
              <option value="">유닛 선택</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>{u.title}</option>
              ))}
            </select>
          </div>
        )
      })}
    </div>
  )
}
