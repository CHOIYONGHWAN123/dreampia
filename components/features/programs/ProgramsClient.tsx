'use client'

import { useMemo, useState } from 'react'
import { formatUnitTitle } from '@/lib/format-unit-title'
import {
  getEventCategories,
  createEventCategory,
  updateEventCategory,
  deleteEventCategory,
  deleteEventCategoryCascade,
  getEventCategoryChildCount,
  getEventCategoryEventCount,
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
  type EventCategoryData,
  type FieldData,
  type OccupationData,
  type OccupationProgramData,
  type OccupationProgramUnitData,
  type UnitFormPayload,
} from '@/app/(dashboard)/programs/actions'
import type { PptTemplateData } from '@/app/(dashboard)/ppt-templates/actions'
import { NameColumn } from './NameColumn'
import { FieldColumn } from './FieldColumn'
import { EventCategoryColumn } from './EventCategoryColumn'
import { UnitFormPopup } from './UnitFormPopup'

interface Props {
  initialEventCategories: EventCategoryData[]
  initialFields: FieldData[]
  pptTemplates: PptTemplateData[]
}

export function ProgramsClient({ initialEventCategories, initialFields, pptTemplates }: Props) {
  const [eventCategories, setEventCategories] = useState(initialEventCategories)
  const [selectedEventCategoryId, setSelectedEventCategoryId] = useState<string | null>(null)
  const [viewingUnassigned, setViewingUnassigned] = useState(false)

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

  // 분야/직종/프로그램/유닛 선택 상태를 한 번에 비움 (행사구분 변경 등에서 사용)
  const clearFieldLevel = () => {
    setSelectedFieldId(null)
    setOccupations([])
    clearOccupationLevel()
  }
  const clearOccupationLevel = () => {
    setSelectedOccupationId(null)
    setPrograms([])
    clearProgramLevel()
  }
  const clearProgramLevel = () => {
    setSelectedProgramId(null)
    setUnits([])
  }

  const fieldsInView = useMemo(() => {
    if (viewingUnassigned) return fields.filter((f) => f.event_category_ids.length === 0)
    if (selectedEventCategoryId) return fields.filter((f) => f.event_category_ids.includes(selectedEventCategoryId))
    return []
  }, [fields, selectedEventCategoryId, viewingUnassigned])

  // ── 행사구분 선택 ──
  const selectEventCategory = (id: string) => {
    setSelectedEventCategoryId(id)
    setViewingUnassigned(false)
    clearFieldLevel()
  }
  const selectUnassigned = () => {
    setSelectedEventCategoryId(null)
    setViewingUnassigned(true)
    clearFieldLevel()
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

  // ── 행사구분 ──
  const handleAddEventCategory = async (
    name: string,
    elementaryPptTemplateId: string | null,
    secondaryPptTemplateId: string | null
  ) => {
    await createEventCategory(name, elementaryPptTemplateId, secondaryPptTemplateId)
    setEventCategories(await getEventCategories())
  }
  const handleEditEventCategory = async (
    id: string,
    name: string,
    elementaryPptTemplateId: string | null,
    secondaryPptTemplateId: string | null
  ) => {
    await updateEventCategory(id, name, elementaryPptTemplateId, secondaryPptTemplateId)
    setEventCategories(await getEventCategories())
  }
  const handleDeleteEventCategory = async (id: string) => {
    const categoryName = eventCategories.find((c) => c.id === id)?.name ?? ''
    try {
      const eventCount = await getEventCategoryEventCount(id)
      if (eventCount > 0) {
        alert(`"${categoryName}" 행사구분을 사용 중인 행사가 ${eventCount}건 있어 삭제할 수 없습니다. 먼저 해당 행사들의 행사구분을 변경해주세요.`)
        return
      }
      const childCount = await getEventCategoryChildCount(id)
      if (childCount > 0) {
        if (!confirm(`"${categoryName}" 행사구분을 삭제하면 하위 분야 ${childCount}개와 관련 직종/프로그램/유닛이 모두 삭제됩니다.\n계속하시겠습니까?`)) return
        await deleteEventCategoryCascade(id)
      } else {
        if (!confirm(`"${categoryName}" 행사구분을 삭제하시겠습니까?`)) return
        await deleteEventCategory(id)
      }
      setEventCategories(await getEventCategories())
      setFields(await getFields())
      if (selectedEventCategoryId === id) {
        setSelectedEventCategoryId(null)
        clearFieldLevel()
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  // ── 분야 ──
  const handleAddField = async (name: string, eventCategoryIds: string[]) => {
    await createField(eventCategoryIds, name)
    setFields(await getFields())
  }
  const handleEditField = async (id: string, name: string, eventCategoryIds: string[]) => {
    await updateField(id, name, eventCategoryIds)
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
        clearFieldLevel()
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

  const selectedEventCategoryName = viewingUnassigned
    ? '미분류'
    : eventCategories.find((c) => c.id === selectedEventCategoryId)?.name
  const selectedFieldName = fields.find(f => f.id === selectedFieldId)?.name
  const selectedOccupationName = occupations.find(o => o.id === selectedOccupationId)?.name
  const selectedProgramName = programs.find(p => p.id === selectedProgramId)?.name

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">프로그램 관리</h1>
        <p className="text-sm text-gray-400 mt-1">
          행사구분 → 분야 → 직종 → 프로그램 → 프로그램 유닛 순서로 선택하며 관리합니다.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="flex flex-col w-72 shrink-0">
          <EventCategoryColumn
            title="행사구분"
            items={eventCategories}
            pptTemplates={pptTemplates}
            selectedId={viewingUnassigned ? null : selectedEventCategoryId}
            onSelect={selectEventCategory}
            onAdd={handleAddEventCategory}
            onEdit={handleEditEventCategory}
            onDelete={handleDeleteEventCategory}
            emptyMessage="등록된 행사구분이 없습니다."
          />
          <button
            type="button"
            onClick={selectUnassigned}
            className={`mt-2 px-3 py-1.5 text-xs rounded-full border transition-colors ${
              viewingUnassigned
                ? 'bg-primary-500 text-white border-primary-500 font-semibold'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            미분류 분야 보기
          </button>
        </div>

        <FieldColumn
          title="분야"
          items={fieldsInView}
          eventCategories={eventCategories}
          selectedId={selectedFieldId}
          onSelect={selectField}
          onAdd={handleAddField}
          onEdit={handleEditField}
          onDelete={handleDeleteField}
          emptyMessage="등록된 분야가 없습니다."
          disabled={!selectedEventCategoryId && !viewingUnassigned}
          disabledMessage="행사구분을 먼저 선택해주세요."
          defaultEventCategoryIds={selectedEventCategoryId ? [selectedEventCategoryId] : []}
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
        <div className="flex flex-col w-72 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">프로그램 유닛</span>
            <button
              onClick={() => setUnitPopup({ open: true, unit: null })}
              disabled={!selectedProgramId}
              className="px-4 py-1.5 text-xs bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              추가
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] flex-1 min-h-50 overflow-y-auto">
            {!selectedProgramId ? (
              <div className="py-16 text-center text-gray-400 text-xs px-2">
                프로그램을 먼저 선택해주세요.
              </div>
            ) : units.length > 0 ? (
              units.map(unit => (
                <div
                  key={unit.id}
                  className="flex items-start justify-between gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0"
                >
                  <span className="text-sm flex-1 min-w-0">{formatUnitTitle(unit.title, unit.school_level)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setUnitPopup({ open: true, unit })}
                      className="px-2 py-0.5 text-xs rounded border border-primary-300 text-primary-600 hover:bg-primary-50 transition-colors"
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
      {(selectedEventCategoryName || selectedFieldName || selectedOccupationName || selectedProgramName) && (
        <p className="text-xs text-gray-400 mt-4">
          {[selectedEventCategoryName, selectedFieldName, selectedOccupationName, selectedProgramName].filter(Boolean).join(' › ')}
        </p>
      )}

      {unitPopup.open && selectedProgramId && (
        <UnitFormPopup
          initial={unitPopup.unit}
          occupationProgramId={selectedProgramId}
          pptTemplates={pptTemplates}
          onClose={() => setUnitPopup({ open: false, unit: null })}
          onSubmit={handleSubmitUnit}
        />
      )}
    </div>
  )
}
