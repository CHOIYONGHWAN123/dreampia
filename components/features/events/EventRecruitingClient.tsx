'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInvitation } from '@/app/(dashboard)/events/[id]/recruiting/actions'
import type {
  RecruitingEventRow,
  CandidateMentor,
  InvitationSummary,
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

const INVITE_TYPE_LABEL: Record<InviteType, string> = {
  partial: '부분수락',
  all: '모든수락',
}

const badgeCls = 'inline-block px-2 py-0.5 rounded text-xs whitespace-nowrap'

function invitationBadge(status: string, isAllApprovalRequired: boolean) {
  if (status === '발송중') {
    return (
      <span className={`${badgeCls} bg-blue-50 text-blue-600`}>
        초대중 ({INVITE_TYPE_LABEL[isAllApprovalRequired ? 'all' : 'partial']})
      </span>
    )
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
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [pendingType, setPendingType] = useState<InviteType | null>(null)
  const [selectedMentorIds, setSelectedMentorIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const selectableRows = rows.filter((r) => !r.mentorId && !r.activeInvitation)

  const toggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedRows = rows.filter((r) => selectedRowIds.has(r.id))

  // 모든수락: 선택된 모든 유닛에 등록된(교집합) 멘토만 후보. 부분수락: 선택된 유닛 중 하나라도 등록된(합집합) 멘토.
  const eligibleMentors = useMemo(() => {
    if (!pendingType) return []
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
  }, [pendingType, selectedRows, mentorsByUnit])

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

  return (
    <div className="p-8 max-w-6xl">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강사 섭외</h1>
        <p className="mt-1 text-sm text-gray-500">{eventName}</p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-10" />
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20">일자</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20">시작</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20">종료</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-24">대상</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700">요청 직업군</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700">프로그램</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-20">인원수</th>
              <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-40">배정 현황</th>
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
                    <td className="px-3 py-2.5 text-center text-gray-800">{fmtTime(r.endTime)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{r.target ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{r.occupationName}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{r.unitTitle}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{r.headcount ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {r.mentorId ? (
                        <span className={`${badgeCls} bg-green-50 text-green-700`}>{r.mentorName} (배정 완료)</span>
                      ) : r.activeInvitation ? (
                        invitationBadge('발송중', r.activeInvitation.isAllApprovalRequired)
                      ) : (
                        <span className="text-xs text-gray-400">미배정</span>
                      )}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-400">
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

              {eligibleMentors.length === 0 ? (
                <p className="text-xs text-red-500">
                  {pendingType === 'all'
                    ? '선택한 일정을 전부 소화할 수 있는 강사가 없습니다. 프로그램 조합을 다시 확인해주세요.'
                    : '등록된 후보 강사가 없습니다.'}
                </p>
              ) : (
                <div className="space-y-1 max-h-56 overflow-y-auto border border-gray-100 rounded p-2">
                  {eligibleMentors.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 px-1 py-1 text-sm hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMentorIds.has(m.id)}
                        onChange={() => toggleMentor(m.id)}
                      />
                      <span className="text-gray-800">{m.name}</span>
                      <span className="text-xs text-gray-400">
                        (점수: {m.score ?? '-'} / 소속: {m.belongsToName ?? '개인'})
                      </span>
                    </label>
                  ))}
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
                  {invitationBadge(inv.status, inv.isAllApprovalRequired)}
                  <span className="text-xs text-gray-400">일정 {inv.eventRowIds.length}건</span>
                  <span className="text-xs text-gray-400">
                    만료: {new Date(inv.expiresAt).toLocaleString('ko-KR')}
                  </span>
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
