'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { updateCrimeCheckNotified } from '@/app/(dashboard)/event-operations/actions'

export type EventOperationRow = {
  no: number
  id: string
  region1: string | null
  region2: string | null
  category: string | null
  institutionName: string | null
  campaignName: string | null
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
  commAdminName: string | null
  recruitStatus: string | null
  recruitDelivered: boolean | null
  schoolRequestDelivered: boolean | null
  crimeCheckMethod: string | null
  crimeCheckNotified: boolean | null
  crimeCheckStatus: string | null
  adminDocsDelivered: boolean | null
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

interface Props {
  rows: EventOperationRow[]
  availableMonths: { year: number; month: number }[]
  currentYear: number
  currentMonth: number
}

// ── 포맷 헬퍼 ────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtTime(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
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

const th = 'px-2 py-2 text-center text-[11px] font-medium text-gray-600 bg-amber-50 border-b border-r border-gray-200 whitespace-nowrap sticky top-0 z-10'
const td = 'px-2 py-2 text-center text-[11px] text-gray-700 border-b border-r border-gray-100 align-middle whitespace-nowrap'
const tdL = 'px-2 py-2 text-left text-[11px] text-gray-700 border-b border-r border-gray-100 align-middle'

const Badge = ({ text, color }: { text: string; color: 'green' | 'red' | 'gray' | 'blue' | 'orange' | 'purple' }) => {
  const cls = {
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-500',
    gray: 'bg-gray-100 text-gray-500',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  }[color]
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${cls}`}>{text}</span>
}

const BoolCell = ({
  value,
  trueText = '완료',
  falseText = '예정',
}: {
  value: boolean | null
  trueText?: string
  falseText?: string
}) => {
  if (value === null || value === undefined) return <span className="text-gray-300">-</span>
  return value
    ? <Badge text={trueText} color="green" />
    : <Badge text={falseText} color="gray" />
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

// ── 메인 컴포넌트 ────────────────────────────────────────────────────

export function EventOperationsClient({ rows, availableMonths, currentYear, currentMonth }: Props) {
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
      {/* 헤더 */}
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

      {/* 요약 */}
      <p className="text-sm text-gray-500 mb-3">
        {currentYear}년 {currentMonth}월 ·{' '}
        <span className="font-semibold text-gray-800">{rows.length}</span>건
      </p>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="border-collapse text-[11px]" style={{ minWidth: '3800px' }}>
          <thead>
            <tr>
              <th className={th} style={{ width: 36 }}>NO</th>
              <th className={th} style={{ width: 48 }}>지역1</th>
              <th className={th} style={{ width: 56 }}>지역2</th>
              <th className={th} style={{ width: 56 }}>분류</th>
              <th className={th} style={{ width: 120 }}>기관</th>
              <th className={th} style={{ width: 80 }}>행사분류</th>
              <th className={th} style={{ width: 80 }}>현장담당</th>
              <th className={th} style={{ width: 140 }}>행사일시</th>
              <th className={th} style={{ width: 64 }}>학년</th>
              <th className={th} style={{ width: 80 }}>예산</th>
              <th className={th} style={{ width: 80 }}>계약종류</th>
              <th className={th} style={{ width: 90 }}>계약현황</th>
              <th className={th} style={{ width: 56 }}>행사체크</th>
              <th className={th} style={{ width: 80 }}>준비물</th>
              <th className={th} style={{ width: 72 }}>행사안내<br/>(1주일전)</th>
              <th className={th} style={{ width: 72 }}>소통담당자</th>
              <th className={th} style={{ width: 80 }}>강사섭외현황</th>
              <th className={th} style={{ width: 72 }}>강사섭외<br/>전달여부</th>
              <th className={th} style={{ width: 72 }}>학교요청<br/>사항다운</th>
              <th className={th} style={{ width: 72 }}>학교요청<br/>전달여부</th>
              <th className={th} style={{ width: 80 }}>범죄경력<br/>조회서종류</th>
              <th className={th} style={{ width: 80 }}>회보서<br/>등록알림</th>
              <th className={th} style={{ width: 72 }}>회보서현황</th>
              <th className={th} style={{ width: 72 }}>행정서류<br/>다운</th>
              <th className={th} style={{ width: 72 }}>행정서류<br/>전달여부</th>
              <th className={th} style={{ width: 72 }}>영업담당자</th>
              <th className={th} style={{ width: 72 }}>견적서<br/>제작여부</th>
              <th className={th} style={{ width: 72 }}>공지사항<br/>알림</th>
              <th className={th} style={{ width: 72 }}>강사섭외<br/>상태</th>
              <th className={th} style={{ width: 80 }}>담당T</th>
              <th className={th} style={{ width: 120 }}>비고</th>
              <th className={th} style={{ width: 80 }}>행사단톡</th>
              <th className={th} style={{ width: 72 }}>유입경로</th>
              <th className={th} style={{ width: 56 }}>입금확인</th>
              <th className={th} style={{ width: 56 }}>행사사진</th>
              <th className={th} style={{ width: 64 }}>행사사진<br/>다운</th>
              <th className={th} style={{ width: 64 }}>행사사진<br/>발송여부</th>
              <th className={th} style={{ width: 56 }}>보고서</th>
              <th className={th} style={{ width: 64 }}>보고서<br/>발송여부</th>
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
                const dateDisplay = row.sessions.length > 0
                  ? row.sessions.map(fmtSession).join('\n')
                  : fmtEventDateRange(row.eventStartAt, row.eventEndAt)

                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className={td}>{row.no}</td>
                    <td className={td}>{row.region1 ?? '-'}</td>
                    <td className={td}>{row.region2 ?? '-'}</td>
                    <td className={td}>{row.category ?? '-'}</td>
                    <td className={`${tdL} font-medium text-gray-800`}>{row.institutionName ?? '-'}</td>
                    <td className={td}>
                      {row.campaignName
                        ? <Badge text={row.campaignName} color="blue" />
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={td}>
                      {row.fieldAdminNames.length > 0
                        ? row.fieldAdminNames.join(', ')
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={`${td} whitespace-pre-line`}>{dateDisplay}</td>
                    <td className={td}>{row.targetGrade ?? '-'}</td>
                    <td className={td}>
                      {row.budget != null ? `₩${row.budget.toLocaleString()}` : '-'}
                    </td>
                    <td className={td}>
                      {row.contractType
                        ? <Badge text={row.contractType} color="purple" />
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={td}>
                      {row.contractStatus
                        ? <Badge text={row.contractStatus}
                            color={row.contractStatus === '계약 완료' ? 'green' : row.contractStatus === '계약 없음' ? 'gray' : 'orange'} />
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={td}>{row.eventCheckStatus}</td>
                    <td className={td}>
                      {row.suppliesStatus
                        ? <Badge text={row.suppliesStatus}
                            color={row.suppliesStatus === '준비 완료' ? 'green' : 'orange'} />
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={td}>
                      <BoolCell value={row.preNoticeSent} trueText="발송" falseText="예정" />
                    </td>
                    <td className={td}>{row.commAdminName ?? '-'}</td>
                    <td className={td}>
                      {row.recruitStatus
                        ? <Badge text={row.recruitStatus}
                            color={row.recruitStatus === '섭외완료' ? 'green' : row.recruitStatus === '섭외진행중' ? 'blue' : 'gray'} />
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={td}>
                      <BoolCell value={row.recruitDelivered} trueText="완료" falseText="예정" />
                    </td>
                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>
                    <td className={td}>
                      <BoolCell value={row.schoolRequestDelivered} trueText="완료" falseText="예정" />
                    </td>
                    <td className={td}>{row.crimeCheckMethod ?? '-'}</td>
                    <td className={td}>
                      {row.crimeCheckNotified
                        ? <Badge text="발송됨" color="green" />
                        : (
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
                      {row.crimeCheckStatus
                        ? <Badge text={row.crimeCheckStatus}
                            color={row.crimeCheckStatus === '완료' ? 'green' : row.crimeCheckStatus === '불필요' ? 'gray' : 'orange'} />
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>
                    <td className={td}>
                      <BoolCell value={row.adminDocsDelivered} trueText="완료" falseText="예정" />
                    </td>
                    <td className={td}>{row.salesAdminName ?? '-'}</td>
                    <td className={td}>
                      {row.estimateFileUrl
                        ? <Badge text="완료" color="green" />
                        : <Badge text="제작 필요" color="orange" />}
                    </td>
                    <td className={td}>
                      <PlaceholderBtn label="알림보내기" />
                    </td>
                    <td className={td}>
                      {danger
                        ? <Badge text="위험" color="red" />
                        : <span className="text-gray-300">-</span>}
                    </td>
                    <td className={td}>{row.teacherName ?? '-'}</td>
                    <td className={`${tdL} max-w-[120px] overflow-hidden text-ellipsis`}>{row.remarks ?? '-'}</td>
                    <td className={td}>
                      {row.groupChatLink
                        ? <a href={row.groupChatLink} target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 underline text-[11px]">링크</a>
                        : <Badge text="개설 전" color="gray" />}
                    </td>
                    <td className={td}>{row.inflowSource ?? '-'}</td>
                    <td className={td}>
                      <BoolCell value={row.paymentConfirmed} trueText="확인" falseText="미확인" />
                    </td>
                    <td className={td}>
                      {row.photoStatus === null
                        ? <span className="text-gray-300">-</span>
                        : row.photoStatus
                          ? <Badge text="완료" color="green" />
                          : <Badge text="미완료" color="orange" />}
                    </td>
                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>
                    <td className={td}>
                      <BoolCell value={row.photoSent} trueText="발송" falseText="미발송" />
                    </td>
                    <td className={td}>
                      <PlaceholderBtn label="다운" />
                    </td>
                    <td className={td}>
                      <BoolCell value={row.reportSent} trueText="발송" falseText="미발송" />
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
