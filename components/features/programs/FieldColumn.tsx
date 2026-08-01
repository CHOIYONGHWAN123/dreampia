'use client'

import { useState } from 'react'

interface FieldItem {
  id: string
  name: string
  event_category_id: string | null
}

interface Props {
  title: string
  items: FieldItem[]
  eventCategories: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: (name: string, eventCategoryId: string | null) => Promise<void>
  onEdit: (id: string, name: string, eventCategoryId: string | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
  emptyMessage: string
  disabled?: boolean
  disabledMessage?: string
  defaultEventCategoryId: string | null
}

// NameColumn과 동일한 목록/추가/수정/삭제 UI이되, 분야는 event_category_id를 함께 지정해야 해서
// 추가/수정 모달에 행사구분 select가 하나 더 있다.
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
  defaultEventCategoryId,
}: Props) {
  const [popup, setPopup] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [name, setName] = useState('')
  const [eventCategoryId, setEventCategoryId] = useState<string>('')
  const [pending, setPending] = useState(false)

  const openAdd = () => {
    setName('')
    setEventCategoryId(defaultEventCategoryId ?? '')
    setPopup({ open: true, id: null })
  }

  const openEdit = (item: FieldItem) => {
    setName(item.name)
    setEventCategoryId(item.event_category_id ?? '')
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
      const categoryId = eventCategoryId || null
      if (popup.id) {
        await onEdit(popup.id, trimmed, categoryId)
      } else {
        await onAdd(trimmed, categoryId)
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
    <div className="flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <button
          onClick={openAdd}
          disabled={disabled}
          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          추가
        </button>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-50 overflow-y-auto">
        {disabled ? (
          <div className="py-16 text-center text-gray-400 text-xs px-2">{disabledMessage}</div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors ${
                selectedId === item.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-sm truncate">{item.name}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(item)
                  }}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    selectedId === item.id
                      ? 'border-white/40 hover:bg-white/10'
                      : 'border-gray-300 hover:bg-gray-50'
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
          <div className="bg-white rounded-lg p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-medium mb-4">{popup.id ? `${title} 수정` : `${title} 추가`}</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요."
              autoFocus
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
            {popup.id && (
              <>
                <label className="text-xs text-gray-500 mt-3 mb-1 block">행사 구분</label>
                <select
                  value={eventCategoryId}
                  onChange={(e) => setEventCategoryId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                >
                  <option value="">미분류</option>
                  {eventCategories.map((ec) => (
                    <option key={ec.id} value={ec.id}>{ec.name}</option>
                  ))}
                </select>
              </>
            )}
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={handleSave}
                disabled={pending}
                className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? '저장 중…' : '확인'}
              </button>
              <button
                onClick={closePopup}
                disabled={pending}
                className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
