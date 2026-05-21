'use client'

import { useState, useRef } from 'react'
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
  event_start_at: string | null
  event_end_at: string | null
  start_recruit_at: string | null
  recruit_delivered: boolean | null
  institution_request_status: string | null
  estimate_file_url: string | null
  admin_docs_delivered: boolean | null
  contract_status: string | null
}

const DISABLED_BTN = 'px-3 py-1 text-xs border border-gray-200 rounded text-gray-300 cursor-not-allowed whitespace-nowrap'
const SELECT_CLS = 'border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400'

function formatDateTime(dt: string | null) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' })
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
  const [startingId, setStartingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [localEvents, setLocalEvents] = useState<Event[]>(events)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const pendingEvents = localEvents.filter(
    (e) => e.recruit_status === '섭외대기' || e.recruit_status === null
  )
  const inProgressEvents = localEvents.filter(
    (e) => e.recruit_status === '섭외진행중' || e.recruit_status === '섭외완료'
  )

  const patchEvent = (eventId: string, patch: Partial<Event>) => {
    setLocalEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...patch } : e)))
  }

  const handleStartRecruit = async (eventId: string) => {
    setStartingId(eventId)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('events')
      .update({ recruit_status: '섭외진행중', start_recruit_at: now })
      .eq('id', eventId)
    if (!error) patchEvent(eventId, { recruit_status: '섭외진행중', start_recruit_at: now })
    setStartingId(null)
  }

  const handleUpdateField = async (eventId: string, field: string, value: boolean | string | null) => {
    const { error } = await supabase.from('events').update({ [field]: value }).eq('id', eventId)
    if (!error) patchEvent(eventId, { [field]: value } as Partial<Event>)
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('이 행사를 삭제하시겠습니까?')) return
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (!error) setLocalEvents((prev) => prev.filter((e) => e.id !== eventId))
  }

  const handleEstimateUpload = async (eventId: string, file: File) => {
    setUploadingId(eventId)
    const ext = file.name.split('.').pop()
    const path = `estimates/${eventId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(path, file, { upsert: true })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('files').getPublicUrl(path)
      await handleUpdateField(eventId, 'estimate_file_url', urlData.publicUrl)
    }
    setUploadingId(null)
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
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-12">no</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">시작일시</th>
                <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">종료일시</th>
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
                    <td className="px-4 py-2.5 text-center text-gray-800">{formatDateTime(event.event_start_at)}</td>
                    <td className="px-4 py-2.5 text-center text-gray-800">{formatDateTime(event.event_end_at)}</td>
                    <td className="px-4 py-2.5 text-gray-800">{event.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{event.memo ?? '-'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-800">{event.teacher_name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        disabled={startingId === event.id}
                        className="px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                        onClick={() => handleStartRecruit(event.id)}
                      >
                        {startingId === event.id ? '처리중...' : '섭외 시작'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">
                    섭외 대기 중인 행사가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 진행 */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-gray-700">진행</span>
          {inProgressEvents.length > 0 && (
            <span className="text-xs font-bold text-red-500">{inProgressEvents.length}</span>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="text-sm" style={{ minWidth: '1600px' }}>
            <thead>
              <tr className="bg-amber-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-12">no</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-24">시작일시</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-24">종료일시</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-36">행사명</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-32">담당선생님</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">강사 섭외 현황</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-24">섭외 현황<br />페이지</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">강사섭외일자</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">강사 섭외<br />전달 여부</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">학교요청사항<br />다운</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">학교요청사항</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-32">성범조 조회서<br />등록 알림</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-24">견적서</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">행정서류<br />다운받기</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">행정서류<br />전달</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">계약 현황</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-28">공지사항<br />알림보내기</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-700 w-16">삭제</th>
              </tr>
            </thead>
            <tbody>
              {inProgressEvents.length > 0 ? (
                inProgressEvents.map((event, index) => (
                  <tr key={event.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-center text-gray-600">{index + 1}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{formatDateTime(event.event_start_at)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{formatDateTime(event.event_end_at)}</td>
                    <td className="px-3 py-2.5 text-gray-800">{event.name}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{event.teacher_name ?? '-'}</td>
                    <td className="px-3 py-2.5 text-center text-gray-800">{event.recruit_status ?? '-'}</td>

                    {/* 섭외 현황 페이지 - 비활성화 */}
                    <td className="px-3 py-2.5 text-center">
                      <button type="button" disabled className={DISABLED_BTN}>보기</button>
                    </td>

                    {/* 강사섭외일자 */}
                    <td className="px-3 py-2.5 text-center text-gray-800">{formatDateTime(event.start_recruit_at)}</td>

                    {/* 강사 섭외 전달 여부 */}
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={event.recruit_delivered ? 'true' : 'false'}
                        onChange={(e) => handleUpdateField(event.id, 'recruit_delivered', e.target.value === 'true')}
                        className={SELECT_CLS}
                      >
                        <option value="false">예정</option>
                        <option value="true">완료</option>
                      </select>
                    </td>

                    {/* 학교요청사항 다운 - 비활성화 */}
                    <td className="px-3 py-2.5 text-center">
                      <button type="button" disabled className={DISABLED_BTN}>다운</button>
                    </td>

                    {/* 학교요청사항 */}
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={event.institution_request_status ?? '예정'}
                        onChange={(e) => handleUpdateField(event.id, 'institution_request_status', e.target.value)}
                        className={SELECT_CLS}
                      >
                        <option value="예정">예정</option>
                        <option value="전달">전달</option>
                        <option value="회신">회신</option>
                      </select>
                    </td>

                    {/* 성범조 조회서 등록 알림 - 비활성화 */}
                    <td className="px-3 py-2.5 text-center">
                      <button type="button" disabled className={DISABLED_BTN}>알림보내기</button>
                    </td>

                    {/* 견적서 파일 업로드 */}
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="file"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[event.id] = el }}
                        accept=".pdf,.hwp,.xlsx,.xls,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleEstimateUpload(event.id, file)
                          e.target.value = ''
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingId === event.id}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-50"
                        onClick={() => fileInputRefs.current[event.id]?.click()}
                      >
                        {uploadingId === event.id ? '업로드중...' : event.estimate_file_url ? '재업로드' : '업로드'}
                      </button>
                    </td>

                    {/* 행정서류 다운받기 - 비활성화 */}
                    <td className="px-3 py-2.5 text-center">
                      <button type="button" disabled className={DISABLED_BTN}>다운받기</button>
                    </td>

                    {/* 행정서류 전달 */}
                    <td className="px-3 py-2.5 text-center">
                      <select
                        value={event.admin_docs_delivered ? 'true' : 'false'}
                        onChange={(e) => handleUpdateField(event.id, 'admin_docs_delivered', e.target.value === 'true')}
                        className={SELECT_CLS}
                      >
                        <option value="false">예정</option>
                        <option value="true">완료</option>
                      </select>
                    </td>

                    {/* 계약 현황 */}
                    <td className="px-3 py-2.5 text-center text-gray-800">{event.contract_status ?? '-'}</td>

                    {/* 공지사항 알림보내기 - 비활성화 */}
                    <td className="px-3 py-2.5 text-center">
                      <button type="button" disabled className={DISABLED_BTN}>알림보내기</button>
                    </td>

                    {/* 삭제 */}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={18} className="py-10 text-center text-gray-400">
                    진행 중인 행사가 없습니다.
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
