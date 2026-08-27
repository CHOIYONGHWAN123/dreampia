'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// 스프레드시트 헤더처럼 컬럼 제목 클릭 시 드롭다운으로 값을 선택해 필터링하는 공통 컴포넌트.
export function HeaderFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 2, left: r.left })
    }
    setOpen((o) => !o)
  }

  const handleSelect = (v: string | null) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleOpen}
      className="inline-flex items-center gap-1"
    >
      <span>{label}</span>
      <span className={`text-[8px] ${value !== null ? 'text-primary-500' : 'text-primary-300'}`}>▾</span>
      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 shadow-lg rounded min-w-24 max-h-60 overflow-y-auto text-left font-normal"
        >
          <div
            className={`px-3 py-1.5 text-[11px] cursor-pointer hover:bg-gray-50 whitespace-nowrap ${
              value === null ? 'font-bold text-gray-800' : 'text-gray-400'
            }`}
            onClick={() => handleSelect(null)}
          >
            전체
          </div>
          {options.map((opt) => (
            <div
              key={opt}
              className={`px-3 py-1.5 text-[11px] cursor-pointer hover:bg-primary-50 whitespace-nowrap ${
                value === opt ? 'bg-primary-50 font-bold text-primary-700' : 'text-gray-700'
              }`}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </button>
  )
}
