'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatScoreWithGrade } from '@/lib/mentor-grade'
import {
  createInvitation,
  createAutoInvitation,
  previewAutoBundles,
  cancelInvitation,
  cancelAssignment,
  assignMentorDirectly,
} from '@/app/(dashboard)/events/[id]/recruiting/actions'
import type {
  RecruitingEventRow,
  CandidateMentor,
  InvitationSummary,
  BundlePlanGroup,
} from '@/app/(dashboard)/events/[id]/recruiting/actions'

type InviteType = 'partial' | 'all'

function fmtDate(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtTime(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 종료 일시가 시작 일시와 날짜가 다르면(자정을 넘기는 일정 등) 날짜까지 같이 보여줘서
// "시:분"만 보고 같은 날로 착각해 실제로는 날짜가 겹치는 걸 놓치는 일을 방지한다.
function fmtEndTime(startIso: string | null, endIso: string | null) {
  if (!endIso) return '-'
  const start = startIso ? new Date(startIso) : null
  const end = new Date(endIso)
  const sameDate =
    start &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  const time = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  return sameDate ? time : `${end.getMonth() + 1}/${end.getDate()} ${time}`
}

const INVITE_TYPE_LABEL: Record<InviteType, string> = {
  partial: '부분수락',
  all: '모든수락',
}

const badgeCls = 'inline-block px-2 py-0.5 rounded text-xs whitespace-nowrap'

function hasTimeConflict(rows: RecruitingEventRow[]): boolean {
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i]
      const b = rows[j]
      if (!a.startTime || !a.endTime || !b.startTime || !b.endTime) continue
      const aStart = new Date(a.startTime).getTime()
      const aEnd = new Date(a.endTime).getTime()
      const bStart = new Date(b.startTime).getTime()
      const bEnd = new Date(b.endTime).getTime()
      if (aStart < bEnd && aEnd > bStart) return true
    }
  }
  return false
}

type ManualGroup = { key: string; rowIds: string[] }

function invitationBadge(status: string, isAllApprovalRequired: boolean, isAuto: boolean) {
  const typeLabel = INVITE_TYPE_LABEL[isAllApprovalRequired ? 'all' : 'partial']
  if (status === '발송중') {
    return (
      <span className={`${badgeCls} bg-blue-50 text-blue-600`}>
        {isAuto ? '자동섭외중' : '초대중'} ({typeLabel})
      </span>
    )
  }
  if (status === '후보소진') {
    return <span className={`${badgeCls} bg-red-50 text-red-600`}>자동후보소진 ({typeLabel})</span>
  }
  return <span className={`${badgeCls} bg-gray-100 text-gray-500`}>{status}</span>
}

export function EventRecruitingClient({
  eventId,
  eventName,
  rows,
  mentorsByUnit,
  invitations,
}: {
  eventId: string
  eventName: string
  rows: RecruitingEventRow[]
  mentorsByUnit: Record<string, CandidateMentor[]>
  invitations: InvitationSummary[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isCanceling, startCancelTransition] = useTransition()
  const selectableRows = rows.filter((r) => !r.mentorId && !r.activeInvitation)
  // 페이지 진입 시 섭외 가능한 일정 전부를 기본으로 선택해둔다.
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set(selectableRows.map((r) => r.id))
  )
  const [pendingType, setPendingType] = useState<InviteType | null>(null)
  const [selectedMentorIds, setSelectedMentorIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [cancelingRowId, setCancelingRowId] = useState<string | null>(null)
  const [isAssigning, startAssignTransition] = useTransition()
  const [assigningRowId, setAssigningRowId] = useState<string | null>(null)
  const [directAssignSelection, setDirectAssignSelection] = useState<Record<string, string>>({})
  const [isCancelingInvitation, startCancelInvitationTransition] = useTransition()
  const [cancelingInvitationId, setCancelingInvitationId] = useState<string | null>(null)
  const [isAutoPending, startAutoTransition] = useTransition()
  const [autoError, setAutoError] = useState<string | null>(null)
  const [isPreviewPending, startPreviewTransition] = useTransition()
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [autoPreview, setAutoPreview] = useState<{ manual: ManualGroup[]; planned: BundlePlanGroup[] } | null>(null)
  // 프로그램(유닛)이 서로 달라도 관리자가 임의로 "같은 강사가 진행" 묶음을 만들 수 있게 한다.
  // groupSameUnit(같은 유닛 자동 묶음)과 달리, 이건 관리자가 명시적으로 지정한 묶음이라
  // 자동 섭외 시작 시 항상 최우선으로 모두수락 1건으로 발송된다.
  const [manualGroups, setManualGroups] = useState<ManualGroup[]>([])

  const allSelectableChecked =
    selectableRows.length > 0 && selectableRows.every((r) => selectedRowIds.has(r.id))
  const someSelectableChecked = selectableRows.some((r) => selectedRowIds.has(r.id))

  const toggleAllRows = () => {
    setSelectedRowIds(allSelectableChecked ? new Set() : new Set(selectableRows.map((r) => r.id)))
  }

  const toggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedRows = rows.filter((r) => selectedRowIds.has(r.id))

  // 모든수락은 한 명의 강사가 선택된 일정을 전부 수락해야 하므로, 선택한 일정끼리
  // 시간이 겹치면 애초에 어떤 강사도 전부 수락할 수 없다.
  const timeConflictAmongSelected = useMemo(() => hasTimeConflict(selectedRows), [selectedRows])

  // 일정 id -> 소속된 묶음 번호(0부터). 표에 "묶음N" 배지를 보여주는 데 사용.
  const rowGroupIndex = useMemo(() => {
    const map = new Map<string, number>()
    manualGroups.forEach((g, idx) => {
      g.rowIds.forEach((id) => map.set(id, idx))
    })
    return map
  }, [manualGroups])

  // 현재 체크된 일정 중 아직 어떤 묶음에도 속하지 않은 것들을 묶어 새 묶음을 만든다.
  // (이미 묶인 일정은 체크되어 있어도 제외 — 다른 묶음을 만들 때 실수로 섞이지 않도록)
  const handleCreateGroup = () => {
    const groupedIds = new Set(manualGroups.flatMap((g) => g.rowIds))
    const candidateRows = selectedRows.filter((r) => !groupedIds.has(r.id))
    if (candidateRows.length < 2) {
      alert('이미 묶음에 포함된 일정을 제외하면 2건 미만이라 묶을 수 없습니다. 같은 강사가 진행할 일정만 2개 이상 체크한 뒤 눌러주세요.')
      return
    }
    if (hasTimeConflict(candidateRows)) {
      alert('선택한 일정끼리 시간이 겹쳐 같은 강사가 모두 수락할 수 없습니다.')
      return
    }
    setManualGroups((prev) => [...prev, { key: crypto.randomUUID(), rowIds: candidateRows.map((r) => r.id) }])
  }

  const handleRemoveFromGroup = (rowId: string) => {
    setManualGroups((prev) =>
      prev
        .map((g) => (g.rowIds.includes(rowId) ? { ...g, rowIds: g.rowIds.filter((id) => id !== rowId) } : g))
        .filter((g) => g.rowIds.length >= 2)
    )
  }

  // 모든수락: 선택된 모든 유닛에 등록된(교집합) 멘토만 후보. 부분수락: 선택된 유닛 중 하나라도 등록된(합집합) 멘토.
  const eligibleMentors = useMemo(() => {
    if (!pendingType) return []
    if (pendingType === 'all' && timeConflictAmongSelected) return []
    const selectedUnitIds = [...new Set(selectedRows.map((r) => r.unitId).filter(Boolean))] as string[]
    if (selectedUnitIds.length === 0) return []
    const lists = selectedUnitIds.map((uid) => mentorsByUnit[uid] ?? [])
    if (pendingType === 'partial') {
      const map = new Map<string, CandidateMentor>()
      for (const list of lists) for (const m of list) map.set(m.id, m)
      return [...map.values()]
    }
    if (lists.some((l) => l.length === 0)) return []
    const [first, ...rest] = lists
    return first.filter((m) => rest.every((list) => list.some((m2) => m2.id === m.id)))
  }, [pendingType, timeConflictAmongSelected, selectedRows, mentorsByUnit])

  const openPicker = (type: InviteType) => {
    setPendingType(type)
    setSelectedMentorIds(new Set())
    setError(null)
  }

  const closePicker = () => {
    setPendingType(null)
    setSelectedMentorIds(new Set())
    setError(null)
  }

  const toggleMentor = (id: string) => {
    setSelectedMentorIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = () => {
    if (!pendingType) return
    if (selectedMentorIds.size === 0) {
      setError('초대할 강사를 1명 이상 선택해주세요.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await createInvitation({
          eventId,
          eventRowIds: [...selectedRowIds],
          isAllApprovalRequired: pendingType === 'all',
          mentorIds: [...selectedMentorIds],
        })
        setSelectedRowIds(new Set())
        closePicker()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : '초대 발송에 실패했습니다.')
      }
    })
  }

  // 1) 수동으로 묶은 묶음(관리자가 "이 조합은 같은 강사"라고 지정한 것) 중, 묶인 일정 전부가
  //    현재 체크되어 있는 것만 그대로 확정 묶음으로 취급한다.
  // 2) 나머지 체크된 일정은 DB에 등록된 강사-프로그램 등록 현황을 기준으로 실제 가능한 조합을
  //    계산(preview_auto_bundles)해서 미리보기로 보여준다 - 전체가 가능하면 전체 묶음,
  //    안 되면 한 명씩 줄여가며 가능한 조합을 찾는다. 아무것도 아직 발송하지 않는다.
  const handleOpenPreview = () => {
    setAutoError(null)
    setPreviewError(null)
    startPreviewTransition(async () => {
      try {
        const validManualGroups = manualGroups.filter((g) => {
          const groupRows = g.rowIds
            .map((id) => rows.find((r) => r.id === id))
            .filter((r): r is RecruitingEventRow => !!r)
          return (
            groupRows.length >= 2 &&
            groupRows.every((r) => selectedRowIds.has(r.id)) &&
            !hasTimeConflict(groupRows)
          )
        })
        const usedRowIds = new Set(validManualGroups.flatMap((g) => g.rowIds))
        const remainingSelected = selectedRows.filter((r) => !usedRowIds.has(r.id))

        const planned =
          remainingSelected.length > 0
            ? await previewAutoBundles(remainingSelected.map((r) => r.id))
            : []

        setAutoPreview({ manual: validManualGroups, planned })
      } catch (e) {
        setPreviewError(e instanceof Error ? e.message : '묶음 계획 계산에 실패했습니다.')
      }
    })
  }

  // 미리보기에서 확인한 묶음 그대로 실제 발송한다. 각 묶음은 그대로 createAutoInvitation
  // 한 건씩이 되고, 이후 캐스케이드(거절/무응답 시 다음 후보, 모두수락 묶음 후보소진 시
  // 더 작은 묶음으로 자동 재시도)는 전부 DB 쪽에서 알아서 처리된다.
  const handleConfirmAutoInvite = () => {
    if (!autoPreview) return
    setAutoError(null)
    startAutoTransition(async () => {
      try {
        for (const group of autoPreview.manual) {
          await createAutoInvitation(eventId, group.rowIds, true)
        }
        for (const bundle of autoPreview.planned) {
          await createAutoInvitation(eventId, bundle.eventRowIds, bundle.eventRowIds.length > 1)
        }
        setSelectedRowIds(new Set())
        setManualGroups([])
        setAutoPreview(null)
        router.refresh()
      } catch (e) {
        setAutoError(e instanceof Error ? e.message : '자동 섭외 시작에 실패했습니다.')
      }
    })
  }

  const handleCancelPreview = () => {
    setAutoPreview(null)
    setPreviewError(null)
  }

  // 초대(수락 대기) 없이 관리자가 즉시 배정한다. 서버에서 시간충돌(±1시간)과 강사 상태를
  // 검증하므로, 실패하면 그 사유를 그대로 alert로 보여준다.
  const handleDirectAssign = (rowId: string) => {
    const mentorId = directAssignSelection[rowId]
    if (!mentorId) return
    setAssigningRowId(rowId)
    startAssignTransition(async () => {
      try {
        await assignMentorDirectly(eventId, rowId, mentorId)
        setDirectAssignSelection((prev) => {
          const next = { ...prev }
          delete next[rowId]
          return next
        })
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : '직접 배정에 실패했습니다.')
      } finally {
        setAssigningRowId(null)
      }
    })
  }

  const handleCancelAssignment = (rowId: string, mentorName: string | null) => {
    if (!confirm(`${mentorName ?? '해당 강사'}의 배정을 취소하시겠습니까?`)) return
    setCancelingRowId(rowId)
    startCancelTransition(async () => {
      try {
        await cancelAssignment(eventId, rowId)
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : '배정 취소에 실패했습니다.')
      } finally {
        setCancelingRowId(null)
      }
    })
  }

  const handleCancelInvitation = (inv: InvitationSummary) => {
    if (
      !confirm(
        `이 초대를 취소하시겠습니까? (일정 ${inv.eventRowIds.length}건, 응답 대기 중인 강사는 더 이상 수락할 수 없습니다)`
      )
    )
      return
    setCancelingInvitationId(inv.id)
    startCancelInvitationTransition(async () => {
      try {
        await cancelInvitation(eventId, inv.id)
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : '초대 취소에 실패했습니다.')
      } finally {
        setCancelingInvitationId(null)
      }
    })
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강사 섭외</h1>
        <p className="mt-1 text-sm text-gray-500">{eventName}</p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="text-sm" style={{ minWidth: '1500px' }}>
          <thead>
            <tr className="bg-amber-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-10">
                <input
                  type="checkbox"
                  checked={allSelectableChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelectableChecked && someSelectableChecked
                  }}
                  disabled={selectableRows.length === 0}
                  onChange={toggleAllRows}
                  className="disabled:opacity-30"
                />
              </th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20 whitespace-nowrap">일자</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20 whitespace-nowrap">시작</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20 whitespace-nowrap">종료</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-24 whitespace-nowrap">대상</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-24 whitespace-nowrap">요청 직업군</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28 whitespace-nowrap">프로그램</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20 whitespace-nowrap">인원수</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20 whitespace-nowrap">묶음</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-40 whitespace-nowrap">배정 현황</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-40 whitespace-nowrap">직접 배정</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-24 whitespace-nowrap">배정 취소</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((r) => {
                const disabled = !!r.mentorId || !!r.activeInvitation
                return (
                  <tr key={r.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(r.id)}
                        disabled={disabled}
                        onChange={() => toggleRow(r.id)}
                        className="disabled:opacity-30"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-800 whitespace-nowrap">{fmtDate(r.startTime)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{fmtTime(r.startTime)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800 whitespace-nowrap">{fmtEndTime(r.startTime, r.endTime)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{r.target ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{r.occupationName}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{r.unitTitle}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{r.headcount ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {rowGroupIndex.has(r.id) ? (
                        <span className="inline-flex items-center gap-1">
                          <span className={`${badgeCls} bg-purple-50 text-purple-600`}>
                            묶음{rowGroupIndex.get(r.id)! + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromGroup(r.id)}
                            title="묶음에서 제외"
                            className="text-gray-300 hover:text-red-500 leading-none"
                          >
                            ×
                          </button>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.mentorId ? (
                        <span className={`${badgeCls} bg-green-50 text-green-700`}>{r.mentorName} (배정 완료)</span>
                      ) : r.activeInvitation ? (
                        invitationBadge('발송중', r.activeInvitation.isAllApprovalRequired, r.activeInvitation.isAuto)
                      ) : r.exhausted ? (
                        <span className="text-xs text-red-500">미배정 (자동후보소진)</span>
                      ) : (
                        <span className="text-xs text-gray-400">미배정</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {!r.mentorId && r.unitId && (
                        <div className="flex items-center justify-center gap-1">
                          <select
                            value={directAssignSelection[r.id] ?? ''}
                            onChange={(e) =>
                              setDirectAssignSelection((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            className="border border-gray-300 rounded px-1 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 max-w-24"
                          >
                            <option value="">강사 선택</option>
                            {(mentorsByUnit[r.unitId] ?? [])
                              .filter((m) => m.isAvailable && m.isAuthenticated)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            disabled={!directAssignSelection[r.id] || (isAssigning && assigningRowId === r.id)}
                            onClick={() => handleDirectAssign(r.id)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors whitespace-nowrap"
                          >
                            {isAssigning && assigningRowId === r.id ? '배정 중...' : '배정'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {r.mentorId && (
                        <button
                          type="button"
                          onClick={() => handleCancelAssignment(r.id, r.mentorName)}
                          disabled={isCanceling && cancelingRowId === r.id}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 transition-colors"
                        >
                          {isCanceling && cancelingRowId === r.id ? '취소 중...' : '배정 취소'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={12} className="py-10 text-center text-gray-400">
                  등록된 프로그램 유닛이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 선택 액션 바 */}
      {selectableRows.length > 0 && (
        <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{selectedRowIds.size}개 선택됨</span>
            <button
              type="button"
              disabled={selectedRowIds.size === 0 || isPreviewPending}
              onClick={handleOpenPreview}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-40 transition-colors"
            >
              {isPreviewPending ? '묶음 계산 중...' : '자동 섭외 시작'}
            </button>
            <button
              type="button"
              disabled={selectedRowIds.size === 0}
              onClick={handleCreateGroup}
              className="px-3 py-1.5 text-xs border border-purple-300 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-40 transition-colors"
            >
              선택한 일정 묶기
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            프로그램이 서로 달라도 같은 강사가 진행하길 원하는 일정끼리만 체크한 뒤 &quot;선택한 일정 묶기&quot;를 누르면, 자동 섭외 시작 시 그 묶음은 항상 모두수락 1건으로 발송됩니다(표의 &quot;묶음&quot; 열에서 확인·해제 가능).
          </p>
          {previewError && <p className="mt-2 text-xs text-red-500">{previewError}</p>}
          {autoError && <p className="mt-2 text-xs text-red-500">{autoError}</p>}
          <p className="mt-2 text-xs text-gray-400">
            묶이지 않은 나머지 일정은 강사 등록 현황을 기준으로 전체를 한 번에 소화할 수 있는 강사가 있는지 먼저 확인하고, 없으면 한 일정씩 줄여가며 실제로 가능한 조합을 찾아 &quot;자동 섭외 시작&quot; 클릭 시 미리보기로 보여줍니다. 가능한(등록+시간충돌없음+활동가능) 멘토 중 최고점수인 멘토 전원에게 동시 발송되고, 먼저 수락하는 사람이 배정됩니다. 전원이 거절/무응답(24시간)하면 다음 등수로, 모두수락 묶음이 후보소진되면 더 작은 묶음으로 자동으로 넘어갑니다.
          </p>

          {autoPreview && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">발송 전 확인</p>
              <div className="space-y-1.5 mb-3">
                {autoPreview.manual.map((g, i) => {
                  const groupRows = g.rowIds
                    .map((id) => rows.find((r) => r.id === id))
                    .filter((r): r is RecruitingEventRow => !!r)
                  return (
                    <div key={g.key} className="flex items-center gap-2 text-xs border border-purple-100 bg-purple-50 rounded px-2 py-1.5">
                      <span className="font-medium text-purple-700 whitespace-nowrap">묶음{i + 1} (직접 지정)</span>
                      <span className="text-gray-600 flex-1">{groupRows.map((r) => r.unitTitle).join(' + ')}</span>
                    </div>
                  )
                })}
                {autoPreview.planned.map((bundle, i) => {
                  const groupRows = bundle.eventRowIds
                    .map((id) => rows.find((r) => r.id === id))
                    .filter((r): r is RecruitingEventRow => !!r)
                  const zeroCandidate = bundle.candidateCount === 0
                  return (
                    <div
                      key={bundle.eventRowIds.join(',')}
                      className={`flex items-center gap-2 text-xs border rounded px-2 py-1.5 ${
                        zeroCandidate ? 'border-red-100 bg-red-50' : 'border-blue-100 bg-blue-50'
                      }`}
                    >
                      <span className={`font-medium whitespace-nowrap ${zeroCandidate ? 'text-red-600' : 'text-blue-700'}`}>
                        {autoPreview.manual.length + i + 1} ({bundle.eventRowIds.length > 1 ? '모든수락' : '부분수락'})
                      </span>
                      <span className="text-gray-600 flex-1">{groupRows.map((r) => r.unitTitle).join(' + ')}</span>
                      <span className={`whitespace-nowrap ${zeroCandidate ? 'text-red-500' : 'text-gray-500'}`}>
                        가능 강사 {bundle.candidateCount}명
                      </span>
                    </div>
                  )
                })}
                {autoPreview.manual.length === 0 && autoPreview.planned.length === 0 && (
                  <p className="text-xs text-gray-400">발송할 일정이 없습니다.</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isAutoPending || (autoPreview.manual.length === 0 && autoPreview.planned.length === 0)}
                  onClick={handleConfirmAutoInvite}
                  className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {isAutoPending ? '발송 중...' : '발송'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelPreview}
                  disabled={isAutoPending}
                  className="px-4 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">직접 강사를 선택해서 보내려면:</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={selectedRowIds.size === 0}
                onClick={() => openPicker('partial')}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                부분수락으로 초대
              </button>
              <button
                type="button"
                disabled={selectedRowIds.size === 0}
                onClick={() => openPicker('all')}
                className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                모든수락으로 초대
              </button>
            </div>
          </div>

          {pendingType && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {INVITE_TYPE_LABEL[pendingType]}으로 초대할 강사 선택
                {pendingType === 'all' && (
                  <span className="ml-2 text-xs text-gray-400">
                    (선택한 일정을 모두 소화 가능한 강사만 표시됩니다)
                  </span>
                )}
              </p>

              {pendingType === 'all' && timeConflictAmongSelected ? (
                <p className="text-xs text-red-500">
                  선택한 일정끼리 시간이 겹쳐 한 명의 강사가 모두 수락할 수 없습니다. 선택을 다시 확인해주세요.
                </p>
              ) : eligibleMentors.length === 0 ? (
                <p className="text-xs text-red-500">
                  {pendingType === 'all'
                    ? '선택한 일정을 전부 소화할 수 있는 강사가 없습니다. 프로그램 조합을 다시 확인해주세요.'
                    : '등록된 후보 강사가 없습니다.'}
                </p>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto border border-gray-100 rounded p-2">
                  {eligibleMentors.map((m) => {
                    const disabledReason = !m.isAvailable
                      ? '강의불가'
                      : !m.isAuthenticated
                        ? '미인증'
                        : null
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 px-1 py-1 text-sm rounded ${
                          disabledReason ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMentorIds.has(m.id)}
                          disabled={!!disabledReason}
                          onChange={() => toggleMentor(m.id)}
                        />
                        <span className="text-gray-800">{m.name}</span>
                        <span className="text-xs text-gray-400">
                          (점수: {formatScoreWithGrade(m.score)} / 소속: {m.belongsToName ?? '개인'})
                        </span>
                        {disabledReason && (
                          <span className="text-xs text-red-400 font-medium">({disabledReason})</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}

              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || eligibleMentors.length === 0}
                  className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {isPending ? '발송 중...' : '초대 발송'}
                </button>
                <button
                  type="button"
                  onClick={closePicker}
                  className="px-4 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 발송된 초대 목록 */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">발송된 초대</h2>
        {invitations.length === 0 ? (
          <p className="text-xs text-gray-400">아직 발송된 초대가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {invitationBadge(inv.status, inv.isAllApprovalRequired, inv.isAuto)}
                  <span className="text-xs text-gray-400">일정 {inv.eventRowIds.length}건</span>
                  <span className="text-xs text-gray-400">
                    만료: {new Date(inv.expiresAt).toLocaleString('ko-KR')}
                  </span>
                  {inv.status === '발송중' && (
                    <button
                      type="button"
                      onClick={() => handleCancelInvitation(inv)}
                      disabled={isCancelingInvitation && cancelingInvitationId === inv.id}
                      className="ml-auto px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-40 transition-colors"
                    >
                      {isCancelingInvitation && cancelingInvitationId === inv.id ? '취소 중...' : '초대 취소'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {inv.mentors.map((m) => (
                    <span key={m.id} className={`${badgeCls} bg-gray-50 text-gray-600 border border-gray-200`}>
                      {m.mentorName} · {m.status}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
