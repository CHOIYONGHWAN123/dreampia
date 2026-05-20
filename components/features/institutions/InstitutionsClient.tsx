'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['유치원', '초등', '중등', '고등', '기관', '특수학교', '문화센터']

type Institution = {
  id: string
  region1: string
  region2: string | null
  name: string
  address: string | null
  category: string | null
  created_at: string
}

export function InstitutionsClient({ institutions }: { institutions: Institution[] }) {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')
  const [filterRegion1, setFilterRegion1] = useState('')
  const [filterRegion2, setFilterRegion2] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const region1List = useMemo(
    () => [...new Set(institutions.map((i) => i.region1))].sort(),
    [institutions]
  )

  const region2List = useMemo(() => {
    const base = filterRegion1 ? institutions.filter((i) => i.region1 === filterRegion1) : institutions
    return [...new Set(base.map((i) => i.region2).filter(Boolean) as string[])].sort()
  }, [institutions, filterRegion1])

  const filtered = useMemo(() => {
    return institutions.filter((i) => {
      if (filterRegion1 && i.region1 !== filterRegion1) return false
      if (filterRegion2 && i.region2 !== filterRegion2) return false
      if (filterCategory && i.category !== filterCategory) return false
      if (searchText && !i.name.includes(searchText)) return false
      return true
    })
  }, [institutions, filterRegion1, filterRegion2, filterCategory, searchText])

  const handleRegion1Change = (value: string) => {
    setFilterRegion1(value)
    setFilterRegion2('')
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학교 관리</h1>
        <button
          type="button"
          className="px-4 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 transition-colors"
          onClick={() => router.push('/institutions/new')}
        >
          학교추가
        </button>
      </div>

      {/* 검색 / 필터 */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={filterRegion1}
          onChange={(e) => handleRegion1Change(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">지역1 전체</option>
          {region1List.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={filterRegion2}
          onChange={(e) => setFilterRegion2(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">지역2 전체</option>
          {region2List.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">기관 전체</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="학교명 검색"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 w-56"
        />
      </div>

      {/* 등록된 학교 수 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">등록된 학교 수</span>
        <span className="text-sm font-bold text-red-500">{filtered.length}</span>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-14">no</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-24">지역1</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-24">지역2</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28">기관</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">학교명</th>
              <th className="px-4 py-2.5 w-52" />
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((institution, index) => (
                <tr key={institution.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-center text-gray-600">{index + 1}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{institution.region1}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{institution.region2 ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{institution.category ?? '-'}</td>
                  <td className="px-4 py-2.5 text-gray-800">{institution.name}</td>
                  <td className="px-4 py-2.5 text-center" colSpan={3}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                        onClick={() => router.push(`/institutions/${institution.id}`)}
                      >
                        보기
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                        onClick={() => router.push(`/institutions/${institution.id}/edit`)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                        onClick={() => router.push(`/events/new?institutionId=${institution.id}`)}
                      >
                        행사 등록
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-16 text-center text-gray-400">
                  등록된 학교가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
