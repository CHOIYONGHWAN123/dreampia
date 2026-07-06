'use client'

import { useState } from 'react'
import {
  getFields,
  getOccupationsByFieldId,
  getOccupationProgramsByOccupationId,
  getUnitsByOccupationProgramId,
  createField,
  updateField,
  deleteField,
  deleteFieldCascade,
  getFieldChildCount,
  createOccupation,
  updateOccupation,
  deleteOccupation,
  deleteOccupationCascade,
  getOccupationChildCount,
  createOccupationProgram,
  updateOccupationProgram,
  deleteOccupationProgram,
  deleteOccupationProgramCascade,
  getOccupationProgramChildCount,
  createUnit,
  updateUnit,
  deleteUnit,
  type FieldData,
  type OccupationData,
  type OccupationProgramData,
  type OccupationProgramUnitData,
  type ProgramCategoryData,
  type UnitFormPayload,
} from '@/app/(dashboard)/programs/actions'
import { NameColumn } from './NameColumn'
import { UnitFormPopup } from './UnitFormPopup'

interface Props {
  initialFields: FieldData[]
  programCategories: ProgramCategoryData[]
}

export function ProgramsClient({ initialFields, programCategories }: Props) {
  const [fields, setFields] = useState(initialFields)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)

  const [occupations, setOccupations] = useState<OccupationData[]>([])
  const [selectedOccupationId, setSelectedOccupationId] = useState<string | null>(null)

  const [programs, setPrograms] = useState<OccupationProgramData[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)

  const [units, setUnits] = useState<OccupationProgramUnitData[]>([])
  const [unitPopup, setUnitPopup] = useState<{ open: boolean; unit: OccupationProgramUnitData | null }>({
    open: false,
    unit: null,
  })

  // 직종/프로그램/유닛 선택 상태를 한 번에 비움 (필드 변경, 직종 삭제 등에서 사용)
  const clearOccupationLevel = () => {
    setSelectedOccupationId(null)
    setPrograms([])
    clearProgramLevel()
  }
  const clearProgramLevel = () => {
    setSelectedProgramId(null)
    setUnits([])
  }

  // ── 선택 ──
  const selectField = async (fieldId: string) => {
    setSelectedFieldId(fieldId)
    clearOccupationLevel()
    setOccupations(await getOccupationsByFieldId(fieldId))
  }
  const selectOccupation = async (occupationId: string) => {
    setSelectedOccupationId(occupationId)
    clearProgramLevel()
    setPrograms(await getOccupationProgramsByOccupationId(occupationId))
  }
  const selectProgram = async (programId: string) => {
    setSelectedProgramId(programId)
    setUnits(await getUnitsByOccupationProgramId(programId))
  }

  // ── 분야 ──
  const handleAddField = async (name: string) => {
    await createField(name)
    setFields(await getFields())
  }
  const handleEditField = async (id: string, name: string) => {
    await updateField(id, name)
    setFields(await getFields())
  }
  const handleDeleteField = async (id: string) => {
    const fieldName = fields.find((f) => f.id === id)?.name ?? ''
    try {
      const childCount = await getFieldChildCount(id)
      if (childCount > 0) {
        if (!confirm(`"${fieldName}" 분야를 삭제하면 하위 직종 ${childCount}개와 관련 프로그램, 유닛이 모두 삭제됩니다.\n계속하시겠습니까?`)) return
        await deleteFieldCascade(id)
      } else {
        if (!confirm(`"${fieldName}" 분야를 삭제하시겠습니까?`)) return
        await deleteField(id)
      }
      setFields(await getFields())
      if (selectedFieldId === id) {
        setSelectedFieldId(null)
        setOccupations([])
        clearOccupationLevel()
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  // ── 직종 ──
  const handleAddOccupation = async (name: string) => {
    if (!selectedFieldId) return
    await createOccupation(selectedFieldId, name)
    setOccupations(await getOccupationsByFieldId(selectedFieldId))
  }
  const handleEditOccupation = async (id: string, name: string) => {
    await updateOccupation(id, name)
    if (selectedFieldId) setOccupations(await getOccupationsByFieldId(selectedFieldId))
  }
  const handleDeleteOccupation = async (id: string) => {
    const occName = occupations.find((o) => o.id === id)?.name ?? ''
    try {
      const childCount = await getOccupationChildCount(id)
      if (childCount > 0) {
        if (!confirm(`"${occName}" 직종을 삭제하면 하위 프로그램 ${childCount}개와 관련 유닛이 모두 삭제됩니다.\n계속하시겠습니까?`)) return
        await deleteOccupationCascade(id)
      } else {
        if (!confirm(`"${occName}" 직종을 삭제하시겠습니까?`)) return
        await deleteOccupation(id)
      }
      if (selectedFieldId) setOccupations(await getOccupationsByFieldId(selectedFieldId))
      if (selectedOccupationId === id) clearOccupationLevel()
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  // ── 직업 프로그램 ──
  const handleAddProgram = async (name: string) => {
    if (!selectedOccupationId) return
    await createOccupationProgram(selectedOccupationId, name)
    setPrograms(await getOccupationProgramsByOccupationId(selectedOccupationId))
  }
  const handleEditProgram = async (id: string, name: string) => {
    await updateOccupationProgram(id, name)
    if (selectedOccupationId) setPrograms(await getOccupationProgramsByOccupationId(selectedOccupationId))
  }
  const handleDeleteProgram = async (id: string) => {
    const progName = programs.find((p) => p.id === id)?.name ?? ''
    try {
      const childCount = await getOccupationProgramChildCount(id)
      if (childCount > 0) {
        if (!confirm(`"${progName}" 프로그램을 삭제하면 하위 유닛 ${childCount}개가 모두 삭제됩니다.\n계속하시겠습니까?`)) return
        await deleteOccupationProgramCascade(id)
      } else {
        if (!confirm(`"${progName}" 프로그램을 삭제하시겠습니까?`)) return
        await deleteOccupationProgram(id)
      }
      if (selectedOccupationId) setPrograms(await getOccupationProgramsByOccupationId(selectedOccupationId))
      if (selectedProgramId === id) clearProgramLevel()
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  // ── 프로그램 유닛 ──
  const handleSubmitUnit = async (payload: UnitFormPayload) => {
    if (!selectedProgramId) return
    if (unitPopup.unit) {
      await updateUnit(unitPopup.unit.id, payload)
    } else {
      await createUnit(selectedProgramId, payload)
    }
    setUnits(await getUnitsByOccupationProgramId(selectedProgramId))
  }
  const handleDeleteUnit = async (id: string) => {
    const unitTitle = units.find((u) => u.id === id)?.title ?? ''
    if (!confirm(`"${unitTitle}" 유닛을 삭제하시겠습니까?`)) return
    try {
      await deleteUnit(id)
      if (selectedProgramId) setUnits(await getUnitsByOccupationProgramId(selectedProgramId))
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  const selectedFieldName = fields.find(f => f.id === selectedFieldId)?.name
  const selectedOccupationName = occupations.find(o => o.id === selectedOccupationId)?.name
  const selectedProgramName = programs.find(p => p.id === selectedProgramId)?.name

  return (
    <div className="p-8">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">프로그램 관리</h1>
        <p className="text-sm text-gray-400 mt-1">
          분야 → 직종 → 프로그램 → 프로그램 유닛 순서로 선택하며 관리합니다.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <NameColumn
          title="분야"
          items={fields}
          selectedId={selectedFieldId}
          onSelect={selectField}
          onAdd={handleAddField}
          onEdit={handleEditField}
          onDelete={handleDeleteField}
          emptyMessage="등록된 분야가 없습니다."
        />

        <NameColumn
          title="직종"
          items={occupations}
          selectedId={selectedOccupationId}
          onSelect={selectOccupation}
          onAdd={handleAddOccupation}
          onEdit={handleEditOccupation}
          onDelete={handleDeleteOccupation}
          emptyMessage="등록된 직종이 없습니다."
          disabled={!selectedFieldId}
          disabledMessage="분야를 먼저 선택해주세요."
        />

        <NameColumn
          title="프로그램"
          items={programs}
          selectedId={selectedProgramId}
          onSelect={selectProgram}
          onAdd={handleAddProgram}
          onEdit={handleEditProgram}
          onDelete={handleDeleteProgram}
          emptyMessage="등록된 프로그램이 없습니다."
          disabled={!selectedOccupationId}
          disabledMessage="직종을 먼저 선택해주세요."
        />

        {/* 프로그램 유닛 */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">프로그램 유닛</span>
            <button
              onClick={() => setUnitPopup({ open: true, unit: null })}
              disabled={!selectedProgramId}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              추가
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-50 overflow-y-auto">
            {!selectedProgramId ? (
              <div className="py-16 text-center text-gray-400 text-xs px-2">
                프로그램을 먼저 선택해주세요.
              </div>
            ) : units.length > 0 ? (
              units.map(unit => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0"
                >
                  <span className="text-sm truncate">{unit.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setUnitPopup({ open: true, unit })}
                      className="px-2 py-0.5 text-xs rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="px-2 py-0.5 text-xs rounded border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-gray-400 text-xs">
                등록된 프로그램 유닛이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 선택 경로 표시 */}
      {(selectedFieldName || selectedOccupationName || selectedProgramName) && (
        <p className="text-xs text-gray-400 mt-4">
          {[selectedFieldName, selectedOccupationName, selectedProgramName].filter(Boolean).join(' › ')}
        </p>
      )}

      {unitPopup.open && (
        <UnitFormPopup
          initial={unitPopup.unit}
          programCategories={programCategories}
          onClose={() => setUnitPopup({ open: false, unit: null })}
          onSubmit={handleSubmitUnit}
        />
      )}
    </div>
  )
}
