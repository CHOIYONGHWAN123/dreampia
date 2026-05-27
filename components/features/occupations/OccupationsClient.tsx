'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { OccupationProgramData, FieldData, OccupationData, ProgramCategoryData } from '@/app/(dashboard)/occupations/actions'

type Props = {
  programs: OccupationProgramData[]
  fields: FieldData[]
  occupations: OccupationData[]
  programCategories: ProgramCategoryData[]
}

export function OccupationsClient({ programs, fields, occupations, programCategories }: Props) {
  const router = useRouter()

  // 검색 / 필터 상태
  const [searchText, setSearchText] = useState('')
  const [filterField, setFilterField] = useState('')
  const [filterOccupation, setFilterOccupation] = useState('')

  // 분야 목록 (fields prop 우선)
  const fieldOptions = useMemo(() => fields, [fields])

  // 직업군 목록 (선택된 분야 기준 동적 필터 — fields FK 없으므로 전체 표시)
  const occupationOptions = useMemo(() => {
    if (!filterField) return occupations
    // fields와 occupations 간 FK가 없으므로 전체 직업군 표시
    return occupations
  }, [occupations, filterField])

  // 필터링된 프로그램 목록
  const filtered = useMemo(() => {
    return programs.filter((p) => {
      const occupationName = p.occupations?.name ?? ''
      const categoryName = p.program_categories?.name ?? ''
      const programTitle = p.title ?? ''

      // 분야(카테고리) 필터
      if (filterField && categoryName !== filterField) return false
      // 직업군 필터
      if (filterOccupation && occupationName !== filterOccupation) return false
      // 텍스트 검색 (직업군 OR 프로그램명 OR 카테고리)
      if (searchText) {
        const q = searchText.toLowerCase()
        const match =
          occupationName.toLowerCase().includes(q) ||
          programTitle.toLowerCase().includes(q) ||
          categoryName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [programs, filterField, filterOccupation, searchText])

  // 분야 변경 시 직업군 필터 초기화
  const handleFieldChange = (value: string) => {
    setFilterField(value)
    setFilterOccupation('')
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">직업 관리</h1>
        <button
          type="button"
          className="px-4 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 transition-colors"
          onClick={() => router.push('/occupations/new')}
        >
          직업추가
        </button>
      </div>

      {/* 검색 / 필터 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* 검색 입력 */}
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="직업군, 프로그램, 카테고리 검색"
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 w-64"
        />

        {/* 카테고리 필터 (program_categories) */}
        <select
          value={filterField}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">카테고리 전체</option>
          {programCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        {/* 직업군 필터 */}
        <select
          value={filterOccupation}
          onChange={(e) => setFilterOccupation(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          <option value="">직업군 전체</option>
          {occupationOptions.map((o) => (
            <option key={o.id} value={o.name}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {/* 총 개수 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">총 개수</span>
        <span className="text-sm font-bold text-red-500">{filtered.length}</span>
      </div>

      {/* 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-14">no</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-40">직업군</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700">프로그램</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-40">카테고리</th>
              <th className="px-4 py-2.5 text-center font-medium text-gray-700 w-28" />
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((program, index) => (
                <tr
                  key={program.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-2.5 text-center text-gray-600">{index + 1}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">
                    {program.occupations?.name ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">{program.title || program.name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">
                    {program.program_categories?.name ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                      onClick={() => router.push(`/occupations/${program.id}`)}
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gray-400">
                  등록된 직업 프로그램이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
