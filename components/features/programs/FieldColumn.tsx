'use client'

import { useState } from 'react'

interface FieldItem {
  id: string
  name: string
  event_category_ids: string[]
}

interface Props {
  title: string
  items: FieldItem[]
  eventCategories: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: (name: string, eventCategoryIds: string[]) => Promise<void>
  onEdit: (id: string, name: string, eventCategoryIds: string[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
  emptyMessage: string
  disabled?: boolean
  disabledMessage?: string
  defaultEventCategoryIds: string[]
}

// NameColumn과 동일한 목록/추가/수정/삭제 UI이되, 분야는 여러 행사구분에 걸칠 수 있어서
// 추가/수정 모달에 행사구분 체크박스 멀티선택이 하나 더 있다.
export function FieldColumn({
  title,
  items,
  eventCategories,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  emptyMessage,
  disabled = false,
  disabledMessage = '상위 항목을 먼저 선택해주세요.',
  defaultEventCategoryIds,
}: Props) {
  const [popup, setPopup] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [name, setName] = useState('')
  const [eventCategoryIds, setEventCategoryIds] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  const toggleEventCategory = (id: string) =>
    setEventCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  const openAdd = () => {
    setName('')
    setEventCategoryIds(defaultEventCategoryIds)
    setPopup({ open: true, id: null })
  }

  const openEdit = (item: FieldItem) => {
    setName(item.name)
    setEventCategoryIds(item.event_category_ids)
    setPopup({ open: true, id: item.id })
  }

  const closePopup = () => {
    setPopup({ open: false, id: null })
    setPending(false)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }
    const trimmed = name.trim()
    const isDuplicate = items.some((item) => item.name === trimmed && item.id !== popup.id)
    if (isDuplicate) {
      alert(`"${trimmed}"은(는) 이미 존재합니다.`)
      return
    }
    if (pending) return
    setPending(true)
    try {
      if (popup.id) {
        await onEdit(popup.id, trimmed, eventCategoryIds)
      } else {
        await onAdd(trimmed, eventCategoryIds)
      }
      closePopup()
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
      setPending(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id)
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <button
          onClick={openAdd}
          disabled={disabled}
          className="px-4 py-1.5 text-xs bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          추가
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] flex-1 min-h-50 overflow-y-auto">
        {disabled ? (
          <div className="py-16 text-center text-gray-400 text-xs px-2">{disabledMessage}</div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex items-start justify-between gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                selectedId === item.id ? 'bg-primary-500 text-white font-semibold' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-sm flex-1 min-w-0">{item.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(item)
                  }}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    selectedId === item.id
                      ? 'border-white/40 hover:bg-white/10'
                      : 'border-primary-300 text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  수정
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(item.id)
                  }}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    selectedId === item.id
                      ? 'border-white/40 hover:bg-white/10'
                      : 'border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-gray-400 text-xs">{emptyMessage}</div>
        )}
      </div>

      {popup.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={closePopup}>
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(20,20,40,0.15)] p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-extrabold text-gray-900 mb-4">{popup.id ? `${title} 수정` : `${title} 추가`}</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요."
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-400"
            />
            <label className="text-xs text-gray-500 mt-3 mb-1 block">
              행사 구분 <span className="text-gray-300">(복수 선택 가능, 미선택 시 미분류)</span>
            </label>
            <div className="flex flex-wrap gap-1">
              {eventCategories.map((ec) => (
                <button
                  key={ec.id}
                  type="button"
                  onClick={() => toggleEventCategory(ec.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    eventCategoryIds.includes(ec.id)
                      ? 'bg-primary-100 text-primary-700 border-primary-300 font-medium'
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {ec.name}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={handleSave}
                disabled={pending}
                className="px-6 py-2 bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? '저장 중…' : '확인'}
              </button>
              <button
                onClick={closePopup}
                disabled={pending}
                className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
