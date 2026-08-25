'use client'

import { useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

// ── 파일 드롭존 ──────────────────────────────────────────────────────

export function FileDropZone({
  file,
  onChange,
  accept,
}: {
  file: File | null
  onChange: (file: File | null) => void
  accept?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 cursor-pointer transition-colors select-none ${
        dragging
          ? 'border-primary-400 bg-primary-50'
          : file
          ? 'border-green-400 bg-green-50'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          onChange(f)
          e.target.value = ''
        }}
      />

      {file ? (
        <>
          <span className="text-lg">📄</span>
          <span className="text-xs text-green-700 font-medium text-center break-all max-w-full px-1">
            {file.name}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="text-[11px] text-red-400 hover:text-red-600"
          >
            제거
          </button>
        </>
      ) : (
        <>
          <span className="text-lg text-gray-400">📂</span>
          <span className="text-xs text-gray-500 text-center">
            클릭하거나 파일을 끌어다 놓으세요
          </span>
          <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded bg-white border border-gray-200">
            파일 선택
          </span>
        </>
      )}
    </div>
  )
}

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
              ? 'bg-primary-100 text-primary-700 border-primary-300 font-medium'
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
  disabled = false,
}: {
  mentors: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
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

  if (disabled) {
    return (
      <div className="border border-gray-200 rounded px-2 py-1.5 bg-gray-50 text-sm text-gray-400 select-none">
        본인
      </div>
    )
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
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300"
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
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-primary-50"
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

// private 버킷(consent-file 등)용. 공개 URL이 없으므로 버킷 내부 경로를 그대로 반환한다.
export async function uploadPrivateFile(bucket: string, dir: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${dir}/${safeFileName(file)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  return path
}

// private 버킷(id-card 등)에 저장된 파일용. 공개 URL이 없어서 클릭할 때마다
// createSignedUrl()로 잠깐 유효한 링크를 새로 발급받아 연다 (열람 전용, 업로드는 멘토 앱에서만).
export function SignedFileCell({ bucket, path }: { bucket: string; path: string | null }) {
  const [loading, setLoading] = useState(false)

  if (!path) {
    return <span className="text-gray-300 text-xs">없음</span>
  }

  const handleView = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5)
      if (error || !data) {
        alert('파일을 불러오지 못했습니다.')
        return
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleView}
      className="text-primary-600 underline text-xs disabled:opacity-50"
    >
      {loading ? '불러오는 중…' : '보기'}
    </button>
  )
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
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline text-xs">
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

// private 버킷용 열람(SignedFileCell) + 관리자 수동 업로드(FileCell) 결합판.
// 멘토 동의서 3종처럼 "멘토 앱에서 서명해 자동 생성"이 기본이지만, mentors.id != auth.uid()라
// 자기서비스 흐름을 못 타는 예외 계정을 위해 관리자가 수동으로 대신 올릴 수도 있어야 한다.
export function SignedFileCellWithUpload({
  bucket,
  path,
  uploading,
  onUpload,
}: {
  bucket: string
  path: string | null
  uploading: boolean
  onUpload: (file: File) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleView = async () => {
    if (!path) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5)
      if (error || !data) {
        alert('파일을 불러오지 못했습니다.')
        return
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      {path ? (
        <button type="button" disabled={loading} onClick={handleView} className="text-primary-600 underline text-xs disabled:opacity-50">
          {loading ? '불러오는 중…' : '보기'}
        </button>
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
