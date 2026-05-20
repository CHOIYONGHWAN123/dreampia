'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Institution = {
  id: string
  name: string
  address: string | null
}

type Event = {
  id: string
  name: string
  memo: string | null
  teacher_name: string | null
  recruit_status: string | null
  requested_dates: string[] | null
  event_start_at: string | null
}

export function InstitutionDetailClient({
  institution,
  events,
}: {
  institution: Institution
  events: Event[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [localEvents, setLocalEvents] = useState<Event[]>(events)

  const pendingEvents = localEvents.filter((e) => e.recruit_status === '섭외대기' || e.recruit_status === null)

  const handleStartRecruit = async (eventId: string) => {
    setUpdatingId(eventId)
    const { error } = await supabase
      .from('events')
      .update({ recruit_status: '섭외진행중' })
      .eq('id', eventId)

    if (!error) {
      setLocalEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, recruit_status: '섭외진행중' } : e))
      )
    }
    setUpdatingId(null)
  }

  const formatDate = (event: Event) => {
    if (event.event_start_at) {
      return new Date(event.event_start_at).toLocaleDateString('ko-KR', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
      })
    }
    if (event.requested_dates && event.requested_dates.length > 0) {
      return new Date(event.requested_dates[0]).toLocaleDateString('ko-KR', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
      })
    }
    return '-'
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학교 현황 페이지</h1>
        <button
          type="button"
          className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          onClick={() => router.back()}
        >
          목록으로
        </button>
      </div>

      {/* 학교 기본 정보 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-8 w-80">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-2.5 text-gray-500 bg-gray-50 w-20 font-medium">학교명</td>
              <td className="px-4 py-2.5 text-gray-800">{institution.name}</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-gray-500 bg-gray-50 font-medium">주소</td>
              <td className="px-4 py-2.5 text-gray-800">{institution.address ?? '~'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 섭외 대기 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-gray-700">섭외 대기</span>
          {pendingEvents.length > 0 && (
            <span className="text-xs font-bold text-red-500">{pendingEvents.length}</span>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-amber-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-14">no</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">일자</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700">행사명</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700">메모</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-36">담당선생님</th>
                <th className="px-4 py-2.5 w-28" />
              </tr>
            </thead>
            <tbody>
              {pendingEvents.length > 0 ? (
                pendingEvents.map((event, index) => (
                  <tr key={event.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-center text-gray-600">{index + 1}</td>
                    <td className="px-4 py-2.5 text-center text-gray-800">{formatDate(event)}</td>
                    <td className="px-4 py-2.5 text-gray-800">{event.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{event.memo ?? '-'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-800">{event.teacher_name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        disabled={updatingId === event.id}
                        className="px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                        onClick={() => handleStartRecruit(event.id)}
                      >
                        {updatingId === event.id ? '처리중...' : '섭외 시작'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    섭외 대기 중인 행사가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
