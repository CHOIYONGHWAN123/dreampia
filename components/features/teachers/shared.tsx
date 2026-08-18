'use client'

import { useMemo, useRef, useState } from 'react'
import type { InstitutionOption } from '@/app/(dashboard)/teachers/actions'

function institutionLabel(inst: InstitutionOption): string {
  const region = [inst.region1, inst.region2].filter(Boolean).join(' ')
  return region ? `${inst.name} (${region})` : inst.name
}

export function InstitutionSearchSelect({
  institutions,
  value,
  onChange,
  placeholder = '학교 검색',
}: {
  institutions: InstitutionOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = institutions.find((i) => i.id === value)

  const filtered = useMemo(
    () => (search ? institutions.filter((i) => i.name.includes(search)) : institutions).slice(0, 8),
    [institutions, search]
  )

  const handleSelect = (id: string) => {
    onChange(id)
    setSearch('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setSearch('')
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      {selected && !open ? (
        <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1.5 bg-white">
          <span className="text-sm flex-1 text-gray-800">{institutionLabel(selected)}</span>
          <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600 text-xs">
            ✕
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={search}
          placeholder={placeholder}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300"
        />
      )}
      {open && (
        <ul className="absolute z-20 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  tabIndex={0}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(i.id) }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-primary-50"
                >
                  {institutionLabel(i)}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-gray-400">검색 결과 없음</li>
          )}
        </ul>
      )}
    </div>
  )
}
