'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  updateCrimeCheckNotified,
  updateEventField,
  updateEventFieldAdmins,
} from '@/app/(dashboard)/event-operations/actions'
import { createClient } from '@/lib/supabase'

// ── 타입 ──────────────────────────────────────────────────────────────

export type EventOperationRow = {
  no: number
  id: string
  institutionId: string | null
  region1: string | null
  region2: string | null
  category: string | null
  institutionName: string | null
  campaignName: string | null
  fieldAdminIds: string[]
  fieldAdminNames: string[]
  eventStartAt: string | null
  eventEndAt: string | null
  sessions: { startAt: string; endAt: string | null }[]
  targetGrade: string | null
  budget: number | null
  contractType: string | null
  contractStatus: string | null
  eventCheckStatus: number
  suppliesStatus: string | null
  preNoticeSent: boolean
  commAdminId: string | null
  commAdminName: string | null
  recruitStatus: string | null
  recruitDelivered: boolean | null
  schoolRequestDelivered: boolean | null
  crimeCheckMethod: string | null
  crimeCheckNotified: boolean | null
  crimeCheckStatus: string | null
  adminDocsDelivered: boolean | null
  salesAdminId: string | null
  salesAdminName: string | null
  estimateFileUrl: string | null
  teacherName: string | null
  remarks: string | null
  groupChatLink: string | null
  inflowSource: string | null
  paymentConfirmed: boolean | null
  photoStatus: boolean | null
  photoSent: boolean | null
  reportSent: boolean | null
  startRecruitAt: string | null
}

type AdminOption = { id: string; name: string }

interface Props {
  rows: EventOperationRow[]
  availableMonths: { year: number; month: number }[]
  currentYear: number
  currentMonth: number
  admins: AdminOption[]
}

// ── 상수 ─────────────────────────────────────────────────────────────

const CONTRACT_TYPE_OPTIONS = ['학교장터', '수의계약', 'MyDesk', '페이백', '나라장터']
const CONTRACT_STATUS_OPTIONS = [
  '계약 시작 전', '진행중(단일계약)', '진행중(공동계약)', '최종일 계약', '계약 완료', '계약 없음',
]
const EVENT_CHECK_OPTIONS = ['1', '2', '3', '4']

// ── 포맷 헬퍼 ────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtTime(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtSession(s: { startAt: string; endAt: string | null }) {
  const date = fmtDate(s.startAt)
  const start = fmtTime(s.startAt)
  const end = s.endAt ? fmtTime(s.endAt) : null
  return `${date} ${start}${end ? `~${end}` : ''}`
}

function fmtEventDateRange(startAt: string | null, endAt: string | null) {
  if (!startAt) return '-'
  const s = fmtDate(startAt)
  const e = endAt ? fmtDate(endAt) : null
  if (!e || s === e) return s ?? '-'
  return `${s} ~ ${e}`
}

function recruitDanger(status: string | null, startAt: string | null) {
  if (status !== '섭외진행중' || !startAt) return null
  const days = Math.floor((Date.now() - new Date(startAt).getTime()) / 86400000)
  return days >= 7 ? '위험' : null
}

// ── 셀 스타일 ─────────────────────────────────────────────────────────

const th =
  'px-2 py-2 text-center text-[11px] font-medium text-gray-600 bg-amber-50 border-b border-r border-gray-200 whitespace-nowrap sticky top-0 z-10'
const td =
  'px-2 py-1.5 text-center text-[11px] text-gray-700 border-b border-r border-gray-100 align-middle whitespace-nowrap'
const tdL =
  'px-2 py-1.5 text-left text-[11px] text-gray-700 border-b border-r border-gray-100 align-middle'
const selectCls =
  'text-[11px] border border-gray-200 rounded px-1 py-0.5 bg-white w-full cursor-pointer focus:outline-none focus:border-blue-400 disabled:opacity-50'

// ── 공통 뱃지 ────────────────────────────────────────────────────────

const Badge = ({
  text,
  color,
}: {
  text: string
  color: 'green' | 'red' | 'gray' | 'blue' | 'orange' | 'purple'
}) => {
  const cls = {
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-500',
    gray: 'bg-gray-100 text-gray-500',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  }[color]
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${cls}`}>{text}</span>
  )
}

const PlaceholderBtn = ({ label }: { label: string }) => (
  <button
    type="button"
    disabled
    className="px-2 py-0.5 text-[11px] border border-gray-200 rounded text-gray-400 cursor-not-allowed whitespace-nowrap"
  >
    {label}
  </button>
)

// ── 인라인 셀렉트 (enum) ──────────────────────────────────────────────

function InlineSelect({
  value,
  options,
  onSave,
}: {
  value: string | null
  options: string[]
  onSave: (v: string | null) => Promise<void>
}) {
  const [val, setVal] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  const handleChange = async (newVal: string) => {
    const prev = val
    setVal(newVal)
    setSaving(true)
    try {
      await onSave(newVal || null)
    } catch {
      setVal(prev)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={val}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className={selectCls}
    >
      <option value="">-</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

// ── 불리언 셀렉트 ─────────────────────────────────────────────────────

function BoolSelect({
  value,
  trueLabel = '완료',
  falseLabel = '예정',
  onSave,
}: {
  value: boolean | null
  trueLabel?: string
  falseLabel?: string
  onSave: (v: boolean | null) => Promise<void>
}) {
  const [val, setVal] = useState(value === null ? '' : String(value))
  const [saving, setSaving] = useState(false)

  const handleChange = async (newVal: string) => {
    const prev = val
    setVal(newVal)
    setSaving(true)
    try {
      const boolVal = newVal === '' ? null : newVal === 'true'
      await onSave(boolVal)
    } catch {
      setVal(prev)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={val}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className={selectCls}
    >
      <option value="">-</option>
      <option value="true">{trueLabel}</option>
      <option value="false">{falseLabel}</option>
    </select>
  )
}

// ── 관리자 단일 선택 (버튼 + 포털 드롭다운) ────────────────────────────

function SingleAdminPicker({
  adminId,
  admins,
  onSave,
}: {
  adminId: string | null
  admins: AdminOption[]
  onSave: (id: string | null) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState(adminId)
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const [saving, setSaving] = useState(false)
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

  const currentName = admins.find((a) => a.id === selectedId)?.name ?? null

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 2, left: r.left })
    }
    setOpen((o) => !o)
  }

  const handleSelect = async (id: string | null) => {
    const prev = selectedId
    setSelectedId(id)
    setOpen(false)
    setSaving(true)
    try {
      await onSave(id)
    } catch {
      setSelectedId(prev)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {currentName && <span className="text-[11px] text-gray-700">{currentName}</span>}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        disabled={saving}
        className="px-1.5 py-0.5 text-[10px] border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
      >
        {currentName ? '수정' : '추가'}
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 shadow-lg rounded min-w-35 max-h-52 overflow-y-auto"
        >
          <div
            className="px-3 py-2 text-[11px] cursor-pointer hover:bg-gray-50 text-gray-400 border-b"
            onClick={() => handleSelect(null)}
          >
            — 해제
          </div>
          {admins.map((a) => (
            <div
              key={a.id}
              className={`px-3 py-2 text-[11px] cursor-pointer hover:bg-blue-50 ${
                selectedId === a.id ? 'bg-blue-50 font-medium text-blue-700' : ''
              }`}
              onClick={() => handleSelect(a.id)}
            >
              {a.name}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── 현장담당 다중 선택 (포털 드롭다운) ────────────────────────────────

function FieldAdminPicker({
  adminIds,
  admins,
  onSave,
}: {
  adminIds: string[]
  admins: AdminOption[]
  onSave: (ids: string[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<string[]>(adminIds)
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const [saving, setSaving] = useState(false)
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

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 2, left: r.left })
    }
    setOpen((o) => !o)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selected)
      setOpen(false)
    } catch {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const currentNames = admins
    .filter((a) => selected.includes(a.id))
    .map((a) => a.name)
    .join(', ')

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      {currentNames && <span className="text-[11px] text-gray-700">{currentNames}</span>}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        disabled={saving}
        className="px-1.5 py-0.5 text-[10px] border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
      >
        {selected.length > 0 ? '수정' : '추가'}
      </button>
      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
          className="bg-white border border-gray-200 shadow-lg rounded min-w-40"
        >
          <div className="max-h-48 overflow-y-auto">
            {admins.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(a.id)}
                  onChange={() => toggle(a.id)}
                  className="w-3 h-3 cursor-pointer"
                />
                <span className="text-[11px]">{a.name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-1.5 px-3 py-2 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-1 text-[11px] bg-gray-900 text-white rounded disabled:opacity-50"
            >
              저장
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-1 text-[11px] border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── 인라인 텍스트 셀 ──────────────────────────────────────────────────

function InlineTextCell({
  value,
  placeholder = '클릭하여 입력',
  onSave,
}: {
  value: string | null
  placeholder?: string
  onSave: (v: string | null) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await onSave(text.trim() || null)
      setEditing(false)
    } catch {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') { setText(value ?? ''); setEditing(false) }
          }}
          className="text-[11px] border border-gray-300 rounded px-1 py-0.5 w-full focus:outline-none focus:border-blue-400"
          placeholder={placeholder}
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-[10px] px-1.5 py-0.5 text-white bg-blue-500 rounded whitespace-nowrap disabled:opacity-50"
        >
          저장
        </button>
        <button
          onClick={() => { setText(value ?? ''); setEditing(false) }}
          className="text-[10px] px-1.5 py-0.5 border border-gray-300 rounded whitespace-nowrap"
        >
          취소
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-pointer rounded px-1 min-h-5 flex items-center justify-center hover:bg-gray-50"
    >
      {value ? (
        <span className="text-[11px] text-blue-600 underline break-all">{value}</span>
      ) : (
        <span className="text-[10px] text-gray-300">{placeholder}</span>
      )}
    </div>
  )
}

// ── 견적서 파일 업로드 셀 ────────────────────────────────────────────

const ESTIMATE_ACCEPT = '.pdf,.hwp,.docx,.xlsx,.doc,.xls'
const BUCKET = 'estimates'

function EstimateFileCell({
  eventId,
  fileUrl,
}: {
  eventId: string
  fileUrl: string | null
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'bin'
      const path = `${eventId}/${Date.now()}.${ext}`

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path)

      await updateEventField(eventId, { estimate_file_url: urlData.publicUrl })
    } catch (err) {
      alert(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {fileUrl ? (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
          title={fileUrl}
        >
          ✓ 완료
        </a>
      ) : (
        <span className="text-[10px] text-gray-300">미등록</span>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-1.5 py-0.5 text-[10px] border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
      >
        {uploading ? '업로드 중…' : fileUrl ? '재업로드' : '업로드'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ESTIMATE_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────

export function EventOperationsClient({
  rows,
  availableMonths,
  currentYear,
  currentMonth,
  admins,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleMonthChange = (year: number, month: number) => {
    router.push(`/event-operations?year=${year}&month=${month}`)
  }

  const handleCrimeCheckNotify = (eventId: string) => {
    startTransition(async () => {
      try {
        await updateCrimeCheckNotified(eventId)
      } catch (e) {
        alert(e instanceof Error ? e.message : '오류가 발생했습니다.')
      }
    })
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">행사운영확인표</h1>
      </div>

      {/* 월 선택 탭 */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4">
        {availableMonths.length === 0 ? (
          <span className="text-sm text-gray-400">데이터 없음</span>
        ) : (
          availableMonths.map(({ year, month }) => {
            const isActive = year === currentYear && month === currentMonth
            return (
              <button
                key={`${year}-${month}`}
                type="button"
                onClick={() => handleMonthChange(year, month)}
                className={`px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white font-medium'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {year}년 {month}월
              </button>
            )
          })
        )}
      </div>

      <p className="text-sm text-gray-500 mb-3">
        {currentYear}년 {currentMonth}월 ·{' '}
        <span className="font-semibold text-gray-800">{rows.length}</span>건
      </p>

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="border-collapse text-[11px]" style={{ minWidth: '4000px' }}>
          <thead>
            <tr>
              <th className={th} style={{ width: 36 }}>NO</th>
              <th className={th} style={{ width: 48 }}>지역1</th>
              <th className={th} style={{ width: 56 }}>지역2</th>
              <th className={th} style={{ width: 56 }}>분류</th>
              <th className={th} style={{ width: 120 }}>기관</th>
              <th className={th} style={{ width: 80 }}>행사분류</th>
              <th className={th} style={{ width: 120 }}>현장담당</th>
              <th className={th} style={{ width: 140 }}>행사일시</th>
              <th className={th} style={{ width: 64 }}>학년</th>
              <th className={th} style={{ width: 80 }}>예산</th>
              <th className={th} style={{ width: 100 }}>계약종류</th>
              <th className={th} style={{ width: 130 }}>계약현황</th>
              <th className={th} style={{ width: 80 }}>행사체크</th>
              <th className={th} style={{ width: 80 }}>준비물</th>
              <th className={th} style={{ width: 72 }}>행사안내<br />(1주일전)</th>
              <th className={th} style={{ width: 120 }}>소통담당자</th>
              <th className={th} style={{ width: 80 }}>강사섭외현황</th>
              <th className={th} style={{ width: 72 }}>강사섭외<br />전달여부</th>
              <th className={th} style={{ width: 72 }}>학교요청<br />사항다운</th>
              <th className={th} style={{ width: 90 }}>학교요청<br />전달여부</th>
              <th className={th} style={{ width: 80 }}>범죄경력<br />조회서종류</th>
              <th className={th} style={{ width: 80 }}>회보서<br />등록알림</th>
              <th className={th} style={{ width: 72 }}>회보서현황</th>
              <th className={th} style={{ width: 72 }}>행정서류<br />다운</th>
              <th className={th} style={{ width: 90 }}>행정서류<br />전달여부</th>
              <th className={th} style={{ width: 120 }}>영업담당자</th>
              <th className={th} style={{ width: 100 }}>견적서<br />제작여부</th>
              <th className={th} style={{ width: 72 }}>공지사항<br />알림</th>
              <th className={th} style={{ width: 72 }}>강사섭외<br />상태</th>
              <th className={th} style={{ width: 80 }}>담당T</th>
              <th className={th} style={{ width: 120 }}>비고</th>
              <th className={th} style={{ width: 120 }}>행사단톡</th>
              <th className={th} style={{ width: 72 }}>유입경로</th>
              <th className={th} style={{ width: 90 }}>입금확인</th>
              <th className={th} style={{ width: 56 }}>행사사진</th>
              <th className={th} style={{ width: 64 }}>행사사진<br />다운</th>
              <th className={th} style={{ width: 90 }}>행사사진<br />발송여부</th>
              <th className={th} style={{ width: 56 }}>보고서</th>
              <th className={th} style={{ width: 90 }}>보고서<br />발송여부</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={39} className="py-16 text-center text-gray-400">
                  해당 월의 행사가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const danger = recruitDanger(row.recruitStatus, row.startRecruitAt)
                const dateDisplay =
                  row.sessions.length > 0
                    ? row.sessions.map(fmtSession).join('\n')
                    : fmtEventDateRange(row.eventStartAt, row.eventEndAt)

                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className={td}>{row.no}</td>
                    <td className={td}>{row.region1 ?? '-'}</td>
                    <td className={td}>{row.region2 ?? '-'}</td>
                    <td className={td}>{row.category ?? '-'}</td>

                    {/* 기관 → 행사관리 페이지 링크 */}
                    <td className={`${tdL} font-medium`}>
                      {row.institutionId ? (
                        <a
                          href={`/institutions/${row.institutionId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {row.institutionName ?? '-'}
                        </a>
                      ) : (
                        <span className="text-gray-800">{row.institutionName ?? '-'}</span>
                      )}
                    </td>

                    <td className={td}>
                      {row.campaignName ? (
                        <Badge text={row.campaignName} color="blue" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* 현장담당 — 다중 선택 */}
                    <td className={td}>
                      <FieldAdminPicker
                        adminIds={row.fieldAdminIds}
                        admins={admins}
                        onSave={(ids) => updateEventFieldAdmins(row.id, ids)}
                      />
                    </td>

                    <td className={`${td} whitespace-pre-line`}>{dateDisplay}</td>
                    <td className={td}>{row.targetGrade ?? '-'}</td>
                    <td className={td}>
                      {row.budget != null ? `₩${row.budget.toLocaleString()}` : '-'}
                    </td>

                    {/* 계약종류 */}
                    <td className={td}>
                      <InlineSelect
                        value={row.contractType}
                        options={CONTRACT_TYPE_OPTIONS}
                        onSave={(v) => updateEventField(row.id, { contract_type: v })}
                      />
                    </td>

                    {/* 계약현황 */}
                    <td className={td}>
                      <InlineSelect
                        value={row.contractStatus}
                        options={CONTRACT_STATUS_OPTIONS}
                        onSave={(v) => updateEventField(row.id, { contract_status: v })}
                      />
                    </td>

                    {/* 행사체크 */}
                    <td className={td}>
                      <InlineSelect
                        value={String(row.eventCheckStatus)}
                        options={EVENT_CHECK_OPTIONS}
                        onSave={(v) =>
                          updateEventField(row.id, { event_check_status: v ? parseInt(v) : null })
                        }
                      />
                    </td>

                    <td className={td}>
                      {row.suppliesStatus ? (
                        <Badge
                          text={row.suppliesStatus}
                          color={row.suppliesStatus === '준비 완료' ? 'green' : 'orange'}
                        />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    <td className={td}>
                      {row.preNoticeSent ? (
                        <Badge text="발송" color="green" />
                      ) : (
                        <Badge text="예정" color="gray" />
                      )}
                    </td>

                    {/* 소통담당 */}
                    <td className={td}>
                      <SingleAdminPicker
                        adminId={row.commAdminId}
                        admins={admins}
                        onSave={(id) => updateEventField(row.id, { comm_admin_id: id })}
                      />
                    </td>

                    <td className={td}>
                      {row.recruitStatus ? (
                        <Badge
                          text={row.recruitStatus}
                          color={
                            row.recruitStatus === '섭외완료'
                              ? 'green'
                              : row.recruitStatus === '섭외진행중'
                              ? 'blue'
                              : 'gray'
                          }
                        />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    <td className={td}>
                      {row.recruitDelivered ? (
                        <Badge text="완료" color="green" />
                      ) : (
                        <Badge text="예정" color="gray" />
                      )}
                    </td>

                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>

                    {/* 학교요청 전달여부 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.schoolRequestDelivered}
                        trueLabel="완료"
                        falseLabel="예정"
                        onSave={(v) => updateEventField(row.id, { school_request_delivered: v })}
                      />
                    </td>

                    <td className={td}>{row.crimeCheckMethod ?? '-'}</td>

                    <td className={td}>
                      {row.crimeCheckNotified ? (
                        <Badge text="발송됨" color="green" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCrimeCheckNotify(row.id)}
                          disabled={isPending}
                          className="px-2 py-0.5 text-[11px] border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          발송
                        </button>
                      )}
                    </td>

                    <td className={td}>
                      {row.crimeCheckStatus ? (
                        <Badge
                          text={row.crimeCheckStatus}
                          color={
                            row.crimeCheckStatus === '완료'
                              ? 'green'
                              : row.crimeCheckStatus === '불필요'
                              ? 'gray'
                              : 'orange'
                          }
                        />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>

                    {/* 행정서류 전달여부 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.adminDocsDelivered}
                        trueLabel="완료"
                        falseLabel="예정"
                        onSave={(v) => updateEventField(row.id, { admin_docs_delivered: v })}
                      />
                    </td>

                    {/* 영업담당 */}
                    <td className={td}>
                      <SingleAdminPicker
                        adminId={row.salesAdminId}
                        admins={admins}
                        onSave={(id) => updateEventField(row.id, { sales_admin_id: id })}
                      />
                    </td>

                    {/* 견적서 제작여부 — 파일 업로드 */}
                    <td className={td}>
                      <EstimateFileCell
                        eventId={row.id}
                        fileUrl={row.estimateFileUrl}
                      />
                    </td>

                    <td className={td}>
                      <PlaceholderBtn label="알림보내기" />
                    </td>

                    <td className={td}>
                      {danger ? (
                        <Badge text="위험" color="red" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    <td className={td}>{row.teacherName ?? '-'}</td>

                    <td className={`${tdL} max-w-[120px] overflow-hidden text-ellipsis`}>
                      {row.remarks ?? '-'}
                    </td>

                    {/* 행사단톡 */}
                    <td className={td}>
                      <InlineTextCell
                        value={row.groupChatLink}
                        placeholder="링크 입력"
                        onSave={(v) => updateEventField(row.id, { group_chat_link: v })}
                      />
                    </td>

                    <td className={td}>{row.inflowSource ?? '-'}</td>

                    {/* 입금확인 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.paymentConfirmed}
                        trueLabel="확인"
                        falseLabel="미확인"
                        onSave={(v) => updateEventField(row.id, { payment_confirmed: v })}
                      />
                    </td>

                    <td className={td}>
                      {row.photoStatus === null ? (
                        <span className="text-gray-300">-</span>
                      ) : row.photoStatus ? (
                        <Badge text="완료" color="green" />
                      ) : (
                        <Badge text="미완료" color="orange" />
                      )}
                    </td>

                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>

                    {/* 행사사진 발송여부 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.photoSent}
                        trueLabel="발송"
                        falseLabel="미발송"
                        onSave={(v) => updateEventField(row.id, { photo_sent: v })}
                      />
                    </td>

                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>

                    {/* 보고서 발송여부 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.reportSent}
                        trueLabel="발송"
                        falseLabel="미발송"
                        onSave={(v) => updateEventField(row.id, { report_sent: v })}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
