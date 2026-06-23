'use client'

import { useState } from 'react'

interface Item {
  id: string
  name: string
}

interface Props {
  title: string
  items: Item[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: (name: string) => Promise<void>
  onEdit: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  emptyMessage: string
  disabled?: boolean
  disabledMessage?: string
}

export function NameColumn({
  title,
  items,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  emptyMessage,
  disabled = false,
  disabledMessage = '상위 항목을 먼저 선택해주세요.',
}: Props) {
  const [popup, setPopup] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [name, setName] = useState('')

  const openAdd = () => {
    setName('')
    setPopup({ open: true, id: null })
  }

  const openEdit = (item: Item) => {
    setName(item.name)
    setPopup({ open: true, id: item.id })
  }

  const closePopup = () => setPopup({ open: false, id: null })

  const handleSave = async () => {
    if (!name.trim()) {
      alert('이름을 입력해주세요.')
      return
    }
    try {
      if (popup.id) {
        await onEdit(popup.id, name.trim())
      } else {
        await onAdd(name.trim())
      }
      closePopup()
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return
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
          items.map(item => (
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
                  onClick={e => {
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
                  onClick={e => {
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
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closePopup}
        >
          <div className="bg-white rounded-lg p-6 w-80" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-medium mb-4">{popup.id ? `${title} 수정` : `${title} 추가`}</h2>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름을 입력해주세요."
              autoFocus
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={handleSave}
                className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm"
              >
                확인
              </button>
              <button
                onClick={closePopup}
                className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm"
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
