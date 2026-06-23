'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

// ── 출강 가능 지역 ───────────────────────────────────────────────────

export const AREA_OPTIONS = ['부산', '김해', '울산', '창원'] as const

export function AreaSelector({
  value,
  onChange,
}: {
  value: string[]
  onChange: (areas: string[]) => void
}) {
  const toggle = (area: string) =>
    onChange(value.includes(area) ? value.filter((a) => a !== area) : [...value, area])

  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {AREA_OPTIONS.map((area) => (
        <button
          key={area}
          type="button"
          onClick={() => toggle(area)}
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
            value.includes(area)
              ? 'bg-blue-100 text-blue-700 border-blue-300 font-medium'
              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
          }`}
        >
          {area}
        </button>
      ))}
    </div>
  )
}

// ── 멘토 검색 선택 (소속 강사, 강사료/재료비 입금자 검색용) ─────────

export function MentorSearchSelect({
  mentors,
  value,
  onChange,
  placeholder = '멘토 검색',
}: {
  mentors: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = mentors.find((m) => m.id === value)

  const filtered = useMemo(
    () => (search ? mentors.filter((m) => m.name.includes(search)) : mentors).slice(0, 8),
    [mentors, search]
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
          <span className="text-sm flex-1 text-gray-800">{selected.name}</span>
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
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      )}
      {open && (
        <ul className="absolute z-20 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  tabIndex={0}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(m.id) }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50"
                >
                  {m.name}
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

// ── 파일 업로드 ──────────────────────────────────────────────────────

export function safeFileName(file: File): string {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
  return ext ? `${Date.now()}.${ext}` : String(Date.now())
}

export async function uploadFile(bucket: string, dir: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${dir}/${safeFileName(file)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export function FileCell({
  url,
  uploading,
  onUpload,
}: {
  url: string | null
  uploading: boolean
  onUpload: (file: File) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col items-center gap-0.5">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
          다운로드
        </a>
      ) : (
        <span className="text-gray-300 text-xs">없음</span>
      )}
      <button
        type="button"
        disabled={uploading}
        onClick={() => ref.current?.click()}
        className="text-[10px] text-gray-500 border border-gray-300 rounded px-1.5 py-0.5 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
      >
        {uploading ? '업로드중…' : '파일 업로드'}
      </button>
      <input
        ref={ref}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
