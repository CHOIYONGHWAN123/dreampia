'use client'

import { ProgramUnitPicker, type ProgramOption, type UnitOption, type ProgramCategoryOption } from './ProgramUnitPicker'
import { MentorSearchSelect } from './shared'
import { LevelFileInputs } from './LevelFileInputs'
import type { ProgramEntryState } from './new-mentor-types'

// 프로그램(occupation_programs) 1건 선택 → 교급(다중) → 교급별 유닛/PPT를 입력받는 단위.
export function ProgramEntryForm({
  entry,
  programs,
  units,
  programCategories,
  mentors,
  excludedUnitIds,
  onChange,
  onRemove,
}: {
  entry: ProgramEntryState
  programs: ProgramOption[]
  units: UnitOption[]
  programCategories: ProgramCategoryOption[]
  mentors: { id: string; name: string }[]
  excludedUnitIds: Set<string>
  onChange: (next: ProgramEntryState) => void
  onRemove?: () => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">프로그램</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600"
          >
            이 프로그램 제거
          </button>
        )}
      </div>

      <ProgramUnitPicker
        programs={programs}
        units={units}
        programCategories={programCategories}
        excludedUnitIds={excludedUnitIds}
        value={entry.selection}
        onChange={(selection) => onChange({ ...entry, selection, pptFiles: {}, profileFiles: {} })}
      />

      <LevelFileInputs
        levels={entry.selection.levels}
        onPptChange={(level, file) => onChange({ ...entry, pptFiles: { ...entry.pptFiles, [level]: file } })}
        onProfileChange={(level, file) =>
          onChange({ ...entry, profileFiles: { ...entry.profileFiles, [level]: file } })
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">강사료 입금자</label>
          <MentorSearchSelect
            mentors={mentors}
            value={entry.lectureFeePayerId}
            onChange={(v) => onChange({ ...entry, lectureFeePayerId: v })}
            placeholder="강사료 입금자 검색"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">재료비 입금자</label>
          <MentorSearchSelect
            mentors={mentors}
            value={entry.materialFeePayerId}
            onChange={(v) => onChange({ ...entry, materialFeePayerId: v })}
            placeholder="재료비 입금자 검색"
          />
        </div>
      </div>
    </div>
  )
}
