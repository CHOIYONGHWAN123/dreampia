'use client'

import { useState } from 'react'
import { PREP_BY_OPTIONS } from '@/app/(dashboard)/programs/constants'
import type {
  OccupationProgramUnitData,
  ProgramCategoryData,
  UnitFormPayload,
} from '@/app/(dashboard)/programs/actions'

interface Props {
  initial: OccupationProgramUnitData | null
  programCategories: ProgramCategoryData[]
  onClose: () => void
  onSubmit: (payload: UnitFormPayload) => Promise<void>
}

const emptyForm: UnitFormPayload = {
  title: '',
  materialCostPerPerson: null,
  prepBy: null,
  schoolRequestNote: '',
  finalProductAvailable: false,
  description: '',
  isDeliveryAvailable: false,
  programCategoryId: null,
}

// 팝업이 열릴 때마다 새로 마운트되므로(부모가 unitPopup.open으로 마운트/언마운트를 제어)
// effect 없이 초기값만으로 폼 상태를 구성한다.
function toFormState(initial: OccupationProgramUnitData | null): UnitFormPayload {
  if (!initial) return emptyForm
  return {
    title: initial.title,
    materialCostPerPerson: initial.material_cost_per_person,
    prepBy: initial.prep_by,
    schoolRequestNote: initial.school_request_note ?? '',
    finalProductAvailable: initial.final_product_available ?? false,
    description: initial.description ?? '',
    isDeliveryAvailable: initial.is_delivery_available,
    programCategoryId: initial.program_category_id,
  }
}

export function UnitFormPopup({ initial, programCategories, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<UnitFormPayload>(() => toFormState(initial))

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert('유닛 이름을 입력해주세요.')
      return
    }
    try {
      await onSubmit({ ...form, title: form.title.trim() })
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 w-120 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-medium mb-4">
          {initial ? '프로그램 유닛 수정' : '프로그램 유닛 추가'}
        </h2>
        <div className="space-y-3">
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="유닛 이름을 입력해주세요."
            autoFocus
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">1인당 재료비</label>
              <input
                type="number"
                value={form.materialCostPerPerson ?? ''}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    materialCostPerPerson: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">준비 주체</label>
              <select
                value={form.prepBy ?? ''}
                onChange={e => setForm(f => ({ ...f, prepBy: e.target.value || null }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              >
                <option value="">선택안함</option>
                {PREP_BY_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">프로그램 카테고리</label>
            <select
              value={form.programCategoryId ?? ''}
              onChange={e => setForm(f => ({ ...f, programCategoryId: e.target.value || null }))}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            >
              <option value="">선택안함</option>
              {programCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {[category.school_level, category.experience_type].filter(Boolean).join(' / ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">학교요청사항</label>
            <textarea
              value={form.schoolRequestNote ?? ''}
              onChange={e => setForm(f => ({ ...f, schoolRequestNote: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">프로그램 설명</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.finalProductAvailable ?? false}
                onChange={e => setForm(f => ({ ...f, finalProductAvailable: e.target.checked }))}
              />
              완성품제공가능
            </label>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.isDeliveryAvailable}
                onChange={e => setForm(f => ({ ...f, isDeliveryAvailable: e.target.checked }))}
              />
              택배 가능
            </label>
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm"
          >
            확인
          </button>
          <button onClick={onClose} className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm">
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
