'use client'

import { useMemo } from 'react'
import { ProgramEntryForm } from './ProgramEntryForm'
import { createProgramEntry, type FieldSectionState } from './new-mentor-types'
import type { UnitOption, ProgramCategoryOption } from './ProgramUnitPicker'

const selCls =
  'w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-400'

// "분야 추가" 버튼으로 늘어나는 한 섹션: 분야 → 직종 선택 후, 그 직종에 속한 프로그램(occupation_programs)을
// "프로그램 추가" 버튼으로 여러 개 등록할 수 있다.
export function FieldSectionForm({
  section,
  fields,
  occupations,
  programs,
  units,
  programCategories,
  mentors,
  globalExcludedUnitIds,
  onChange,
  onRemove,
}: {
  section: FieldSectionState
  fields: { id: string; name: string }[]
  occupations: { id: string; name: string; field_id: string | null }[]
  programs: { id: string; name: string; occupation_id: string | null }[]
  units: UnitOption[]
  programCategories: ProgramCategoryOption[]
  mentors: { id: string; name: string }[]
  globalExcludedUnitIds: Set<string>
  onChange: (next: FieldSectionState) => void
  onRemove?: () => void
}) {
  const filteredOccupations = useMemo(
    () => occupations.filter((o) => !section.fieldId || o.field_id === section.fieldId),
    [occupations, section.fieldId]
  )

  const filteredPrograms = useMemo(
    () => programs.filter((p) => p.occupation_id === section.occupationId),
    [programs, section.occupationId]
  )

  return (
    <div className="border border-gray-300 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">분야 섹션</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600">
            이 분야 제거
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">분야</label>
          <select
            className={selCls}
            value={section.fieldId}
            onChange={(e) =>
              onChange({
                ...section,
                fieldId: e.target.value,
                occupationId: '',
                programEntries: [createProgramEntry()],
              })
            }
          >
            <option value="">분야 선택</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">직종</label>
          <select
            className={selCls}
            value={section.occupationId}
            disabled={!section.fieldId}
            onChange={(e) =>
              onChange({
                ...section,
                occupationId: e.target.value,
                programEntries: [createProgramEntry()],
              })
            }
          >
            <option value="">직종 선택</option>
            {filteredOccupations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {section.occupationId && (
        <div className="space-y-2">
          {section.programEntries.map((entry) => (
            <ProgramEntryForm
              key={entry.key}
              entry={entry}
              programs={filteredPrograms}
              units={units}
              programCategories={programCategories}
              mentors={mentors}
              excludedUnitIds={globalExcludedUnitIds}
              onChange={(next) =>
                onChange({
                  ...section,
                  programEntries: section.programEntries.map((e) => (e.key === next.key ? next : e)),
                })
              }
              onRemove={
                section.programEntries.length > 1
                  ? () =>
                      onChange({
                        ...section,
                        programEntries: section.programEntries.filter((e) => e.key !== entry.key),
                      })
                  : undefined
              }
            />
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({ ...section, programEntries: [...section.programEntries, createProgramEntry()] })
            }
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + 프로그램 추가
          </button>
        </div>
      )}
    </div>
  )
}
