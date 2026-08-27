'use client'

import { useRef, useState, useEffect, useMemo, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  updateEventField,
  updateEventDateField,
  updateEventDateFieldAdmins,
  updateEventGroupField,
  updateEventDateCrimeCheckNotified,
  updateEventDateTargetGrade,
} from '@/app/(dashboard)/event-operations/actions'
import { createClient } from '@/lib/supabase'
import { HeaderFilter } from '@/components/ui/HeaderFilter'
import { ExpandableMemoCell } from '@/components/ui/ExpandableMemoCell'

// B(그룹 단위) 필드 저장 — 그 날짜가 그룹에 속해있으면 event_groups를, 아니면
// event_dates(그룹 미지정 시 기본값)를 갱신한다. C(날짜 단위) 필드는 항상 event_dates.
type BFieldData = Parameters<typeof updateEventGroupField>[1]
function saveDateField(row: EventOperationRow, data: BFieldData) {
  return row.groupId ? updateEventGroupField(row.groupId, data) : updateEventDateField(row.id, row.dateKey, data)
}

// ── 타입 ──────────────────────────────────────────────────────────────

export type EventOperationRow = {
  no: number
  id: string
  rowKey: string
  institutionId: string | null
  region1: string | null
  region2: string | null
  eventCategoryName: string | null
  institutionName: string | null
  fieldAdminIds: string[]
  fieldAdminNames: string[]
  eventDate: string | null
  dateKey: string
  groupId: string | null
  dayStart: string | null
  dayEnd: string | null
  targetGrade: string | null
  budget: number | null
  finalBudget: number | null
  contractType: string | null
  contractStatus: string | null
  contractMemo: string | null
  eventCheckStatus: number
  suppliesStatus: string | null
  preNoticeSent: boolean
  commAdminId: string | null
  commAdminName: string | null
  recruitStatus: string | null
  recruitDelivered: boolean | null
  institutionRequestDelivered: boolean | null
  crimeCheckMethod: string | null
  crimeCheckNotified: boolean | null
  crimeCheckStatus: string | null
  crimeCheckDelivered: string | null
  adminDocs: string | null
  adminDocsDelivered: boolean | null
  salesAdminId: string | null
  salesAdminName: string | null
  suppliesAdminId: string | null
  suppliesAdminName: string | null
  contractAdminId: string | null
  contractAdminName: string | null
  recruitAdminId: string | null
  recruitAdminName: string | null
  estimateFileUrl: string | null
  estimateDelivered: boolean | null
  transactionStatementFileUrl: string | null
  teacherName: string | null
  remarks: string | null
  groupChatStatus: string | null
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
  '계약 시작 전(전화 예정)', '계약 시작 전(전화 완료)', '진행중(단일계약)', '진행중(공동계약)', '최종일 계약', '계약 완료', '계약 없음',
]
const EVENT_CHECK_OPTIONS = ['1', '2', '3', '4']
const SUPPLIES_STATUS_OPTIONS = [
  '준비 완료', '체크 전', '재고 이상무', '재고 파악', '주문 필요', '택배 예정', '택배 발송', '회수 필요',
]
const RECRUIT_STATUS_OPTIONS = ['섭외대기', '섭외진행중', '섭외완료']
const CRIME_CHECK_DELIVERED_OPTIONS = ['완료', '예정', '시설출력']
const INFLOW_SOURCE_OPTIONS = [
  '팜플렛', '기존진행', '홈페이지', '블로그', '전화영업', '꿈길', '카카오톡채널', 'MOU', '입찰', '소개',
]
const GROUP_CHAT_STATUS_OPTIONS = ['개설전', '개설완료']

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

function recruitDanger(status: string | null, startAt: string | null) {
  if (status !== '섭외진행중' || !startAt) return null
  const days = Math.floor((Date.now() - new Date(startAt).getTime()) / 86400000)
  return days >= 7 ? '위험' : null
}

// ── 셀 스타일 ─────────────────────────────────────────────────────────

const thBase =
  'px-2 py-2 text-center text-[11px] font-bold text-primary-700 bg-primary-50 border-b border-r border-primary-100 whitespace-nowrap'
const th = `${thBase} sticky top-0 z-10`
const tdBase =
  'px-2 py-1.5 text-center text-[11px] text-gray-700 border-b border-r border-gray-100 align-middle whitespace-nowrap'
const td = tdBase
const tdLBase =
  'px-2 py-1.5 text-left text-[11px] text-gray-700 border-b border-r border-gray-100 align-middle'
const tdL = tdLBase

// ── 왼쪽 고정(freeze) 컬럼 ────────────────────────────────────────────
// NO/지역1/지역2/기관/행사구분/현장담당/행사일시 7개 컬럼은 가로 스크롤을 해도 왼쪽에
// 고정한다.
//
// [이전 구현의 문제] 컬럼마다 개별로 position:sticky를 준 적이 있었는데, 서로 다른
// sticky 요소는 브라우저가 각자 독립된 합성 레이어로 그리기 때문에 스크롤 중 두 레이어의
// sticky 오프셋이 서로 다른 서브픽셀로 반올림되면서 셀 사이에 개발자도구로도 선택되지
// 않는 얇은 렌더링 틈(rendering seam)이 생겼다. 셀이 이웃 쪽으로 파고들게 하는 겹침
// 트릭으로 완화를 시도했지만 완전히 없어지지 않았다 — 애초에 sticky 요소가 여러 개인
// 것 자체가 근본 원인이라 겹침 폭을 늘리는 방식으로는 임시방편일 뿐이었다.
//
// [현재 구현] 고정 영역 전체를 컬럼당 하나가 아니라 행(row)당 "단 하나의" sticky
// td/th(colSpan으로 7개 컬럼을 합침)로 감싸고, 그 안에서 각 컬럼을 일반 flex 자식
// div로 나열한다. flex 자식은 sticky가 아니라 평범한 문서 흐름이라 브라우저가 같은
// 레이어에서 한 번에 픽셀 정확하게 그리므로, 애초에 여러 sticky 레이어 사이의 이음새가
// 생길 여지가 없다.
const FROZEN_WIDTHS = [36, 48, 56, 120, 80, 120, 64]
const FROZEN_TOTAL_WIDTH = FROZEN_WIDTHS.reduce((a, b) => a + b, 0)
// 고정 영역의 마지막 컬럼은 스크롤 중에도 경계가 보이도록 진한 오른쪽 테두리를 준다.
const frozenBoundaryCls = 'border-r-2 border-r-gray-300'

// 고정 영역을 감싸는 바깥 sticky 셀 — colSpan으로 7개 컬럼 폭을 합친 만큼만 차지한다.
// 배경색과 아래쪽 구분선(border-b)은 안쪽 flex 자식이 아니라 이 바깥 셀에 직접 준다 —
// 안쪽 flex 자식의 h-full(퍼센트 높이)이 sticky td 안에서 100%로 정확히 안 잡히는
// 경우(브라우저별 편차) 안쪽 내용이 셀보다 짧아져 위아래에 여백이 남을 수 있는데,
// 배경/테두리를 안쪽이 아니라 무조건 셀 자체 높이(테이블 행 높이 계산으로 항상 정확함)에
// 거는 이 바깥 셀에 두면 그 여백 때문에 뒷배경이 비치거나 구분선이 행 경계와 어긋나
// 보이는 문제가 원천적으로 생기지 않는다.
// 헤더이면서 동시에 고정 컬럼인 좌상단 칸은 위/왼쪽 두 방향 다 sticky라 top만 고정인
// 나머지 헤더(z-10)나 left만 고정인 몸통 셀보다 z-index를 높게 줘야 대각선 스크롤 시
// 한쪽이 다른 쪽 밑에 깔리는 문제가 없다.
const thFrozenOuter = 'sticky top-0 left-0 z-20 p-0 bg-primary-50 border-b border-primary-100'
const tdFrozenOuter = 'sticky left-0 z-[1] p-0 bg-white group-hover:bg-gray-50 border-b border-gray-100'

// 고정 영역 안의 "가상 컬럼" — 실제 th/td가 아니라 flex 자식 div이므로 세로 정렬은
// align-middle 대신 items-center로 준다. 컬럼 사이의 세로 구분선(border-r)만 여기서
// 담당하고, 배경/아래쪽 구분선은 바깥 셀(thFrozenOuter/tdFrozenOuter)이 담당한다.
const vTh =
  'shrink-0 flex items-center justify-center px-2 py-2 text-center text-[11px] font-bold text-primary-700 border-r border-primary-100 whitespace-nowrap'
const vTd =
  'shrink-0 flex items-center justify-center px-2 py-1.5 text-center text-[11px] text-gray-700 border-r border-gray-100 whitespace-nowrap overflow-hidden text-ellipsis'
// 기관명처럼 줄바꿈이 나아 보이는 셀은 truncate 대신 break-words로 세로로만 늘어나게
// 한다(행 높이는 늘어나도 가로 폭은 절대 넘지 않음).
const vTdL =
  'shrink-0 flex items-center px-2 py-1.5 text-left text-[11px] text-gray-700 border-r border-gray-100 overflow-hidden break-words'
// 현장담당처럼 텍스트 여러 개 + 버튼이 함께 들어가는 셀은 한 줄로 잘라버리면 버튼이
// 가려질 수 있어, 말줄임 대신 줄바꿈으로 폭만 막는다.
const vTdWrap =
  'shrink-0 flex items-center justify-center flex-wrap px-2 py-1.5 text-center text-[11px] text-gray-700 border-r border-gray-100 overflow-hidden'
const selectCls =
  'text-[11px] border border-gray-200 rounded-md px-1 py-0.5 bg-white w-full cursor-pointer focus:outline-none focus:border-primary-400 disabled:opacity-50'

// ── 공통 뱃지 ────────────────────────────────────────────────────────

const Badge = ({
  text,
  color,
}: {
  text: string
  color: 'green' | 'red' | 'gray' | 'blue' | 'orange' | 'purple'
}) => {
  const cls = {
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-500',
    gray: 'bg-gray-100 text-gray-500',
    blue: 'bg-primary-50 text-primary-600',
    orange: 'bg-gold-100 text-gold-700',
    purple: 'bg-purple-50 text-purple-600',
  }[color]
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${cls}`}>{text}</span>
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
              className={`px-3 py-2 text-[11px] cursor-pointer hover:bg-primary-50 ${
                selectedId === a.id ? 'bg-primary-50 font-medium text-primary-700' : ''
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
              className="flex-1 py-1 text-[11px] bg-primary-600 text-white rounded disabled:opacity-50"
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
          className="text-[11px] border border-gray-300 rounded px-1 py-0.5 w-full focus:outline-none focus:border-primary-400"
          placeholder={placeholder}
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-[10px] px-1.5 py-0.5 text-white bg-primary-500 rounded whitespace-nowrap disabled:opacity-50"
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
        <span className="text-[11px] text-primary-600 underline break-all">{value}</span>
      ) : (
        <span className="text-[10px] text-gray-300">{placeholder}</span>
      )}
    </div>
  )
}

// ── 인라인 링크 셀 (행정서류 폴더 등) ──────────────────────────────────
// 값이 있으면 클릭 시 새 탭에서 해당 링크로 이동하고, 수정은 별도 버튼으로 분리한다.
// 스킴(https://) 없이 입력해도 저장 시 자동으로 붙여 링크가 깨지지 않게 한다.

function normalizeUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function InlineLinkCell({
  value,
  placeholder = '링크 입력',
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
      await onSave(normalizeUrl(text))
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
          className="text-[11px] border border-gray-300 rounded px-1 py-0.5 w-full focus:outline-none focus:border-primary-400"
          placeholder={placeholder}
        />
        <button onClick={save} disabled={saving} className="text-[10px] px-1.5 py-0.5 text-white bg-primary-500 rounded whitespace-nowrap disabled:opacity-50">저장</button>
        <button onClick={() => { setText(value ?? ''); setEditing(false) }} className="text-[10px] px-1.5 py-0.5 border border-gray-300 rounded whitespace-nowrap">취소</button>
      </div>
    )
  }

  if (!value) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="cursor-pointer rounded px-1 min-h-5 flex items-center justify-center hover:bg-gray-50"
      >
        <span className="text-[10px] text-gray-300">{placeholder}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-1 min-h-5">
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        title={value}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors whitespace-nowrap"
      >
        🔗 열기
      </a>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[10px] px-1 py-0.5 border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap"
      >
        수정
      </button>
    </div>
  )
}

// ── 예산 인라인 편집 셀 ───────────────────────────────────────────────

function InlineBudgetCell({
  value,
  onSave,
  fileUrl,
  fileLabel = '견적서',
}: {
  value: number | null
  onSave: (v: number | null) => Promise<void>
  /** 전달되면 클릭 시 예산 수정 대신 이 URL의 파일을 다운로드하며, 더블클릭으로 예산을 수정한다 */
  fileUrl?: string | null
  /** 파일 미등록 시 경고 문구와 title에 쓰일 파일 종류 이름 */
  fileLabel?: string
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value != null ? String(value) : '')
  const [saving, setSaving] = useState(false)
  const hasFileMode = fileUrl !== undefined

  const save = async () => {
    const raw = text.trim().replace(/,/g, '')
    const num = raw === '' ? null : parseInt(raw, 10)
    if (raw !== '' && isNaN(num!)) {
      alert('숫자를 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      await onSave(num)
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
          type="number"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') { setText(value != null ? String(value) : ''); setEditing(false) }
          }}
          className="text-[11px] border border-gray-300 rounded px-1 py-0.5 w-20 focus:outline-none focus:border-primary-400"
          placeholder="금액"
        />
        <button onClick={save} disabled={saving} className="text-[10px] px-1.5 py-0.5 text-white bg-primary-500 rounded whitespace-nowrap disabled:opacity-50">저장</button>
        <button onClick={() => { setText(value != null ? String(value) : ''); setEditing(false) }} className="text-[10px] px-1.5 py-0.5 border border-gray-300 rounded whitespace-nowrap">취소</button>
      </div>
    )
  }

  const handleClick = () => {
    if (!hasFileMode) {
      setEditing(true)
      return
    }
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer')
    } else {
      alert(`${fileLabel}가 등록되어있지 않습니다`)
    }
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={hasFileMode ? () => setEditing(true) : undefined}
      className="cursor-pointer rounded px-1 min-h-5 flex items-center justify-center hover:bg-gray-50"
      title={hasFileMode ? `클릭: ${fileLabel} 다운로드 / 더블클릭: 예산 수정` : undefined}
    >
      {value != null ? (
        <span className="text-[11px] text-primary-600 underline">₩{value.toLocaleString()}</span>
      ) : (
        <span className="text-[10px] text-gray-300">클릭하여 입력</span>
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

  const [region1Filter, setRegion1Filter] = useState<string | null>(null)
  const [region2Filter, setRegion2Filter] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const region1Options = useMemo(
    () => [...new Set(rows.map((r) => r.region1).filter((v): v is string => !!v))].sort(),
    [rows]
  )
  const region2Options = useMemo(() => {
    const source = region1Filter ? rows.filter((r) => r.region1 === region1Filter) : rows
    return [...new Set(source.map((r) => r.region2).filter((v): v is string => !!v))].sort()
  }, [rows, region1Filter])
  const categoryOptions = useMemo(
    () => [...new Set(rows.map((r) => r.eventCategoryName).filter((v): v is string => !!v))].sort(),
    [rows]
  )

  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        if (region1Filter && r.region1 !== region1Filter) return false
        if (region2Filter && r.region2 !== region2Filter) return false
        if (categoryFilter && r.eventCategoryName !== categoryFilter) return false
        return true
      }),
    [rows, region1Filter, region2Filter, categoryFilter]
  )

  const handleMonthChange = (year: number, month: number) => {
    router.push(`/event-operations?year=${year}&month=${month}`)
  }

  const handleCrimeCheckNotify = (eventId: string, dateKey: string) => {
    startTransition(async () => {
      try {
        await updateEventDateCrimeCheckNotified(eventId, dateKey)
      } catch (e) {
        alert(e instanceof Error ? e.message : '오류가 발생했습니다.')
      }
    })
  }

  return (
    <div className="p-7 bg-gray-50 min-h-full">
      <div className="pb-5 mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">행사운영확인표</h1>
        <p className="text-sm text-gray-400 mt-1">이번 달 진행 중인 행사를 실제 수업일 기준으로 확인하세요.</p>
      </div>

      {/* 월 선택 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
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
                className={`px-4 py-2 text-sm font-bold rounded-full whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-[0_6px_16px_rgba(37,99,235,0.3)]'
                    : 'text-gray-500 hover:bg-gray-100'
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
        <span className="font-semibold text-gray-800">{filteredRows.length}</span>건
        {filteredRows.length !== rows.length && (
          <span className="text-gray-400"> (전체 {rows.length}건 중 필터링됨)</span>
        )}
      </p>

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
        {/* border-collapse는 sticky 셀과 함께 쓰면 셀 경계의 병합된 테두리가 sticky 위치 이동을
            따라가지 못해 그 틈으로 뒤 배경이 비쳐 보이는 버그가 있다(브라우저 렌더링 한계).
            separate + spacing 0으로 바꾸면 각 셀이 자기 테두리를 독립적으로 그려서 해결된다.
            border-r/border-b만 쓰고 있어 겹쳐 그려지던 테두리가 없으므로 시각적 차이는 없다. */}
        <table className="border-separate border-spacing-0 text-[11px]" style={{ minWidth: '4000px' }}>
          <thead>
            <tr>
              <th className={thFrozenOuter} colSpan={7} style={{ width: FROZEN_TOTAL_WIDTH }}>
                <div className="flex h-full">
                  <div className={vTh} style={{ width: FROZEN_WIDTHS[0] }}>NO</div>
                  <div className={vTh} style={{ width: FROZEN_WIDTHS[1] }}>
                    <HeaderFilter
                      label="지역1"
                      options={region1Options}
                      value={region1Filter}
                      onChange={(v) => {
                        setRegion1Filter(v)
                        setRegion2Filter(null)
                      }}
                    />
                  </div>
                  <div className={vTh} style={{ width: FROZEN_WIDTHS[2] }}>
                    <HeaderFilter label="지역2" options={region2Options} value={region2Filter} onChange={setRegion2Filter} />
                  </div>
                  <div className={vTh} style={{ width: FROZEN_WIDTHS[3] }}>기관</div>
                  <div className={vTh} style={{ width: FROZEN_WIDTHS[4] }}>
                    <HeaderFilter label="행사구분" options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} />
                  </div>
                  <div className={vTh} style={{ width: FROZEN_WIDTHS[5] }}>현장담당</div>
                  <div className={`${vTh} ${frozenBoundaryCls}`} style={{ width: FROZEN_WIDTHS[6] }}>행사일시</div>
                </div>
              </th>
              <th className={th} style={{ width: 56 }}>시작시간</th>
              <th className={th} style={{ width: 56 }}>종료시간</th>
              <th className={th} style={{ width: 64 }}>학년</th>
              <th className={th} style={{ width: 80 }}>계약 예산</th>
              <th className={th} style={{ width: 80 }}>최종 예산</th>
              <th className={th} style={{ width: 100 }}>계약종류</th>
              <th className={th} style={{ width: 120 }}>계약<br />관련 메모</th>
              <th className={th} style={{ width: 120 }}>계약담당자</th>
              <th className={th} style={{ width: 80 }}>행사체크</th>
              <th className={th} style={{ width: 80 }}>준비물</th>
              <th className={th} style={{ width: 120 }}>준비물담당자</th>
              <th className={th} style={{ width: 72 }}>행사안내<br />(1주일전)</th>
              <th className={th} style={{ width: 120 }}>소통담당자</th>
              <th className={th} style={{ width: 80 }}>강사섭외현황</th>
              <th className={th} style={{ width: 72 }}>강사섭외<br />확정전달여부</th>
              <th className={th} style={{ width: 120 }}>강사담당자</th>
              <th className={th} style={{ width: 120 }}>행사 단톡</th>
              <th className={th} style={{ width: 72 }}>학교요청<br />사항다운</th>
              <th className={th} style={{ width: 90 }}>학교요청<br />전달여부</th>
              <th className={th} style={{ width: 80 }}>담당T</th>
              <th className={th} style={{ width: 120 }}>비고</th>
              <th className={th} style={{ width: 72 }}>행정서류<br />다운</th>
              <th className={th} style={{ width: 120 }}>행정서류<br />폴더</th>
              <th className={th} style={{ width: 90 }}>행정서류<br />전달여부</th>
              <th className={th} style={{ width: 100 }}>견적서<br />제작여부</th>
              <th className={th} style={{ width: 90 }}>견적서<br />전달여부</th>
              <th className={th} style={{ width: 120 }}>영업담당자</th>
              <th className={th} style={{ width: 80 }}>범죄경력<br />조회서종류</th>
              <th className={th} style={{ width: 80 }}>회보서<br />등록알림</th>
              <th className={th} style={{ width: 72 }}>회보서현황</th>
              <th className={th} style={{ width: 90 }}>회보서<br />전달여부</th>
              <th className={th} style={{ width: 56 }}>행사사진</th>
              <th className={th} style={{ width: 64 }}>행사사진<br />다운</th>
              <th className={th} style={{ width: 90 }}>행사사진<br />발송여부</th>
              <th className={th} style={{ width: 56 }}>보고서</th>
              <th className={th} style={{ width: 90 }}>보고서<br />발송여부</th>
              <th className={th} style={{ width: 90 }}>입금확인</th>
              <th className={th} style={{ width: 130 }}>계약현황</th>
              <th className={th} style={{ width: 72 }}>강사섭외<br />시작일</th>
              <th className={th} style={{ width: 72 }}>강사섭외<br />상태</th>
              <th className={th} style={{ width: 72 }}>유입경로</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={49} className="py-16 text-center text-gray-400">
                  {rows.length === 0 ? '해당 월의 행사가 없습니다.' : '필터에 해당하는 행사가 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const danger = recruitDanger(row.recruitStatus, row.startRecruitAt)
                const dateDisplay = fmtDate(row.eventDate) ?? '-'

                return (
                  <tr key={row.rowKey} className="group hover:bg-gray-50">
                    <td className={tdFrozenOuter} colSpan={7} style={{ width: FROZEN_TOTAL_WIDTH }}>
                      <div className="flex h-full">
                        <div className={vTd} style={{ width: FROZEN_WIDTHS[0] }}>{idx + 1}</div>
                        <div className={vTd} style={{ width: FROZEN_WIDTHS[1] }}>{row.region1 ?? '-'}</div>
                        <div className={vTd} style={{ width: FROZEN_WIDTHS[2] }}>{row.region2 ?? '-'}</div>

                        {/* 기관 → 행사관리 페이지 링크 */}
                        <div className={`${vTdL} font-medium`} style={{ width: FROZEN_WIDTHS[3] }}>
                          {row.institutionId ? (
                            <a
                              href={`/institutions/${row.institutionId}`}
                              className="text-primary-600 hover:underline"
                            >
                              {row.institutionName ?? '-'}
                            </a>
                          ) : (
                            <span className="text-gray-800">{row.institutionName ?? '-'}</span>
                          )}
                        </div>

                        {/* 행사구분 */}
                        <div className={vTd} style={{ width: FROZEN_WIDTHS[4] }}>{row.eventCategoryName ?? '-'}</div>

                        {/* 현장담당 — 다중 선택. 이름이 여러 개면 말줄임 대신 줄바꿈시켜 버튼이 가려지지 않게 한다 */}
                        <div className={vTdWrap} style={{ width: FROZEN_WIDTHS[5] }}>
                          <FieldAdminPicker
                            adminIds={row.fieldAdminIds}
                            admins={admins}
                            onSave={(ids) => updateEventDateFieldAdmins(row.id, row.dateKey, ids)}
                          />
                        </div>

                        <div className={`${vTd} ${frozenBoundaryCls}`} style={{ width: FROZEN_WIDTHS[6] }}>{dateDisplay}</div>
                      </div>
                    </td>
                    <td className={td}>{fmtTime(row.dayStart) ?? '-'}</td>
                    <td className={td}>{fmtTime(row.dayEnd) ?? '-'}</td>

                    <td className={td}>
                      <InlineTextCell
                        value={row.targetGrade}
                        placeholder="학년 입력"
                        onSave={(v) => updateEventDateTargetGrade(row.id, row.dateKey, v)}
                      />
                    </td>

                    {/* 계약 예산 — 클릭 시 견적서 다운로드, 더블클릭 시 예산 수정 */}
                    <td className={td}>
                      <InlineBudgetCell
                        value={row.budget}
                        onSave={(v) => updateEventField(row.id, { budget: v })}
                        fileUrl={row.estimateFileUrl}
                      />
                    </td>

                    {/* 최종 예산 — 클릭 시 거래명세서 다운로드, 더블클릭 시 예산 수정 */}
                    <td className={td}>
                      <InlineBudgetCell
                        value={row.finalBudget}
                        onSave={(v) => updateEventField(row.id, { final_budget: v })}
                        fileUrl={row.transactionStatementFileUrl}
                        fileLabel="거래명세서"
                      />
                    </td>

                    {/* 계약종류 */}
                    <td className={td}>
                      <InlineSelect
                        value={row.contractType}
                        options={CONTRACT_TYPE_OPTIONS}
                        onSave={(v) => updateEventField(row.id, { contract_type: v })}
                      />
                    </td>

                    {/* 계약 관련 메모 — 클릭 시 셀 위치에서 확대된 박스가 float으로 열림 */}
                    <td className={tdL}>
                      <ExpandableMemoCell
                        value={row.contractMemo}
                        onSave={(v) => updateEventField(row.id, { contract_memo: v })}
                        label="계약 관련 메모"
                      />
                    </td>

                    {/* 계약담당 */}
                    <td className={td}>
                      <SingleAdminPicker
                        adminId={row.contractAdminId}
                        admins={admins}
                        onSave={(id) => updateEventField(row.id, { contract_admin_id: id })}
                      />
                    </td>

                    {/* 행사체크 */}
                    <td className={td}>
                      <InlineSelect
                        value={String(row.eventCheckStatus)}
                        options={EVENT_CHECK_OPTIONS}
                        onSave={(v) =>
                          updateEventDateField(row.id, row.dateKey, { event_check_status: v ? parseInt(v) : null })
                        }
                      />
                    </td>

                    <td className={td}>
                      <InlineSelect
                        value={row.suppliesStatus}
                        options={SUPPLIES_STATUS_OPTIONS}
                        onSave={(v) => updateEventDateField(row.id, row.dateKey, { supplies_status: v })}
                      />
                    </td>

                    {/* 준비물담당 */}
                    <td className={td}>
                      <SingleAdminPicker
                        adminId={row.suppliesAdminId}
                        admins={admins}
                        onSave={(id) => updateEventDateField(row.id, row.dateKey, { supplies_admin_id: id })}
                      />
                    </td>

                    <td className={td}>
                      <BoolSelect
                        value={row.preNoticeSent}
                        trueLabel="발송"
                        falseLabel="예정"
                        onSave={(v) => saveDateField(row, { pre_notice_sent: v })}
                      />
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
                      <InlineSelect
                        value={row.recruitStatus}
                        options={RECRUIT_STATUS_OPTIONS}
                        onSave={(v) => updateEventField(row.id, { recruit_status: v })}
                      />
                    </td>

                    {/* 강사섭외 확정전달여부 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.recruitDelivered}
                        trueLabel="완료"
                        falseLabel="예정"
                        onSave={(v) => updateEventField(row.id, { recruit_delivered: v })}
                      />
                    </td>

                    {/* 강사담당 */}
                    <td className={td}>
                      <SingleAdminPicker
                        adminId={row.recruitAdminId}
                        admins={admins}
                        onSave={(id) => updateEventField(row.id, { recruit_admin_id: id })}
                      />
                    </td>

                    {/* 행사 단톡 */}
                    <td className={td}>
                      <InlineSelect
                        value={row.groupChatStatus}
                        options={GROUP_CHAT_STATUS_OPTIONS}
                        onSave={(v) => updateEventDateField(row.id, row.dateKey, { group_chat_status: v })}
                      />
                    </td>

                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>

                    {/* 학교요청 전달여부 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.institutionRequestDelivered}
                        trueLabel="완료"
                        falseLabel="예정"
                        onSave={(v) => saveDateField(row, { institution_request_delivered: v })}
                      />
                    </td>

                    <td className={td}>
                      <InlineTextCell
                        value={row.teacherName}
                        placeholder="담당T 입력"
                        onSave={(v) => updateEventField(row.id, { teacher_name: v })}
                      />
                    </td>

                    <td className={tdL}>
                      <InlineTextCell
                        value={row.remarks}
                        placeholder="비고 입력"
                        onSave={(v) => updateEventDateField(row.id, row.dateKey, { remarks: v })}
                      />
                    </td>

                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>

                    {/* 행정서류 폴더 — 클릭 시 새 탭에서 링크(구글 드라이브 등)로 이동 */}
                    <td className={tdL}>
                      <InlineLinkCell
                        value={row.adminDocs}
                        placeholder="폴더 링크 입력"
                        onSave={(v) => updateEventField(row.id, { admin_docs: v })}
                      />
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

                    {/* 견적서 제작여부 — 파일 업로드 */}
                    <td className={td}>
                      <EstimateFileCell
                        eventId={row.id}
                        fileUrl={row.estimateFileUrl}
                      />
                    </td>

                    {/* 견적서 전달여부 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.estimateDelivered}
                        trueLabel="완료"
                        falseLabel="예정"
                        onSave={(v) => updateEventField(row.id, { estimate_delivered: v })}
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

                    <td className={td}>{row.crimeCheckMethod ?? '-'}</td>

                    <td className={td}>
                      {row.crimeCheckNotified ? (
                        <Badge text="발송됨" color="green" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCrimeCheckNotify(row.id, row.dateKey)}
                          disabled={isPending}
                          className="px-2 py-0.5 text-[11px] border border-primary-300 text-primary-600 rounded hover:bg-primary-50 transition-colors disabled:opacity-50 whitespace-nowrap"
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

                    {/* 회보서 전달여부 */}
                    <td className={td}>
                      <InlineSelect
                        value={row.crimeCheckDelivered}
                        options={CRIME_CHECK_DELIVERED_OPTIONS}
                        onSave={(v) => saveDateField(row, { crime_check_delivered: v })}
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
                        onSave={(v) => saveDateField(row, { photo_sent: v })}
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

                    {/* 입금확인 */}
                    <td className={td}>
                      <BoolSelect
                        value={row.paymentConfirmed}
                        trueLabel="확인"
                        falseLabel="미확인"
                        onSave={(v) => updateEventField(row.id, { payment_confirmed: v })}
                      />
                    </td>

                    {/* ── 이하 순서 목록에 없어 표 맨 뒤로 옮긴 기존 컬럼 ── */}

                    {/* 계약현황 */}
                    <td className={td}>
                      <InlineSelect
                        value={row.contractStatus}
                        options={CONTRACT_STATUS_OPTIONS}
                        onSave={(v) => saveDateField(row, { contract_status: v })}
                      />
                    </td>

                    <td className={td}>{fmtDate(row.startRecruitAt) ?? '-'}</td>

                    <td className={td}>
                      <div className="flex flex-col items-center gap-0.5">
                        {danger && <Badge text="위험" color="red" />}
                        <InlineSelect
                          value={row.recruitStatus}
                          options={RECRUIT_STATUS_OPTIONS}
                          onSave={(v) => updateEventField(row.id, { recruit_status: v })}
                        />
                      </div>
                    </td>

                    <td className={td}>
                      <InlineSelect
                        value={row.inflowSource}
                        options={INFLOW_SOURCE_OPTIONS}
                        onSave={(v) => updateEventField(row.id, { inflow_source: v })}
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
