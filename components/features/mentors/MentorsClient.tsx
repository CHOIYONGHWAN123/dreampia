'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

type Mentor = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  available_areas: string[] | null
  is_available: boolean
  is_authenticated: boolean
  score: number | null
  created_at: string
}

export function MentorsClient({ mentors }: { mentors: Mentor[] }) {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [filterAvailable, setFilterAvailable] = useState('')
  const [filterAuthenticated, setFilterAuthenticated] = useState('')

  const filtered = useMemo(() => {
    return mentors.filter((m) => {
      if (filterAvailable === 'true' && !m.is_available) return false
      if (filterAvailable === 'false' && m.is_available) return false
      if (filterAuthenticated === 'true' && !m.is_authenticated) return false
      if (filterAuthenticated === 'false' && m.is_authenticated) return false
      if (searchText && !m.name.includes(searchText)) return false
      return true
    })
  }, [mentors, filterAvailable, filterAuthenticated, searchText])

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강사 관리</h1>
        <button
          type="button"
          className="px-4 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 transition-colors"
          onClick={() => router.push('/mentors/new')}
        >
          강사 추가
        </button>
      </div>

      {/* 검색 / 필터 */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={filterAvailable}
          onChange={(e) => setFilterAvailable(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">강의가능 전체</option>
          <option value="true">가능</option>
          <option value="false">불가</option>
        </select>

        <select
          value={filterAuthenticated}
          onChange={(e) => setFilterAuthenticated(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">인증 전체</option>
          <option value="true">인증</option>
          <option value="false">미인증</option>
        </select>

        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="강사명 검색"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 w-48"
        />
      </div>

      {/* 등록된 강사 수 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">등록된 강사 수</span>
        <span className="text-sm font-bold text-red-500">{filtered.length}</span>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-12">no</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">이름</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-36">연락처</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">이메일</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">출강가능지역</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-20">강사등급</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-20">강의가능</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-20">인증여부</th>
              <th className="px-4 py-2.5 w-40" />
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((mentor, index) => (
                <tr key={mentor.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-center text-gray-600">{index + 1}</td>
                  <td className="px-4 py-2.5 text-center font-medium text-gray-800">{mentor.name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-700">{mentor.phone ?? '-'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{mentor.email ?? '-'}</td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {mentor.available_areas && mentor.available_areas.length > 0
                      ? mentor.available_areas.join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-700">
                    {mentor.score != null ? mentor.score : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      mentor.is_available
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {mentor.is_available ? '가능' : '불가'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      mentor.is_authenticated
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-red-50 text-red-500'
                    }`}>
                      {mentor.is_authenticated ? '인증' : '미인증'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                        onClick={() => router.push(`/mentors/${mentor.id}`)}
                      >
                        보기
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                        onClick={() => router.push(`/mentors/${mentor.id}/edit`)}
                      >
                        수정
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-16 text-center text-gray-400">
                  등록된 강사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
