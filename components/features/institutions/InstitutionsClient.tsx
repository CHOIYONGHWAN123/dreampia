'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restoreInstitution } from '@/app/(dashboard)/institutions/actions'

const INSTITUTION_TYPES = ['유치원', '초등', '중등', '고등', '기관', '특수학교', '문화센터']

type Institution = {
  id: string
  region1: string
  region2: string | null
  name: string
  address: string | null
  institution_type: string | null
  created_at: string
  is_deleted: boolean
}

export function InstitutionsClient({ institutions }: { institutions: Institution[] }) {
  const router = useRouter()
  const [, startRestoring] = useTransition()
  const [restoringTargetId, setRestoringTargetId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [filterRegion1, setFilterRegion1] = useState('')
  const [filterRegion2, setFilterRegion2] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)

  const handleRestore = (id: string) => {
    setRestoringTargetId(id)
    startRestoring(async () => {
      try {
        await restoreInstitution(id)
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : '복구에 실패했습니다.')
      } finally {
        setRestoringTargetId(null)
      }
    })
  }

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
      if (!showDeleted && i.is_deleted) return false
      if (filterRegion1 && i.region1 !== filterRegion1) return false
      if (filterRegion2 && i.region2 !== filterRegion2) return false
      if (filterCategory && i.institution_type !== filterCategory) return false
      if (searchText && !i.name.includes(searchText)) return false
      return true
    })
  }, [institutions, showDeleted, filterRegion1, filterRegion2, filterCategory, searchText])

  const handleRegion1Change = (value: string) => {
    setFilterRegion1(value)
    setFilterRegion2('')
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">기관 관리</h1>
        <button
          type="button"
          className="px-5 py-2 bg-primary-500 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-primary-600 transition-colors"
          onClick={() => router.push('/institutions/new')}
        >
          기관 추가
        </button>
      </div>

      {/* 검색 / 필터 */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={filterRegion1}
          onChange={(e) => handleRegion1Change(e.target.value)}
          className="border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300"
        >
          <option value="">지역1 전체</option>
          {region1List.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={filterRegion2}
          onChange={(e) => setFilterRegion2(e.target.value)}
          className="border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300"
        >
          <option value="">지역2 전체</option>
          {region2List.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary-300"
        >
          <option value="">기관 전체</option>
          {INSTITUTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="기관명 검색"
          className="border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-300 w-56"
        />

        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="cursor-pointer accent-primary-600"
          />
          삭제된 기관 보기
        </label>
      </div>

      {/* 등록된 학교 수 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">등록된 학교 수</span>
        <span className="text-sm font-bold text-primary-600">{filtered.length}</span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary-50 border-b border-primary-100">
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-14">no</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-24">지역1</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-24">지역2</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700 w-28">기관</th>
              <th className="px-4 py-2.5 text-center font-bold text-primary-700">기관명</th>
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
                  <td className="px-4 py-2.5 text-center text-gray-800">{institution.institution_type ?? '-'}</td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {institution.name}
                    {institution.is_deleted && (
                      <span className="ml-1.5 text-xs text-red-400">(삭제됨)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center" colSpan={3}>
                    <div className="flex items-center justify-center gap-1">
                      {institution.is_deleted ? (
                        <button
                          type="button"
                          disabled={restoringTargetId === institution.id}
                          className="px-3 py-1 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 disabled:opacity-50 transition-colors whitespace-nowrap"
                          onClick={() => handleRestore(institution.id)}
                        >
                          {restoringTargetId === institution.id ? '복구 중...' : '복구'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="px-3 py-1 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
                          onClick={() => router.push(`/institutions/${institution.id}/edit`)}
                        >
                          수정
                        </button>
                      )}
                      <button
                        type="button"
                        className="px-3 py-1 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
                        onClick={() => router.push(`/institutions/${institution.id}`)}
                      >
                        행사 관리
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
