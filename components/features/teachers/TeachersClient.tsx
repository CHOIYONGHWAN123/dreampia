'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TeacherRow } from '@/app/(dashboard)/teachers/actions'

export function TeachersClient({ teachers }: { teachers: TeacherRow[] }) {
  const router = useRouter()
  const [searchText, setSearchText] = useState('')

  const filtered = useMemo(() => {
    if (!searchText) return teachers
    return teachers.filter(
      (t) => t.institutionName.includes(searchText) || t.name.includes(searchText)
    )
  }, [teachers, searchText])

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">선생님 관리</h1>
        <button
          type="button"
          className="px-5 py-2 bg-primary-500 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-primary-600 transition-colors"
          onClick={() => router.push('/teachers/new')}
        >
          선생님 추가
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="학교명 또는 선생님 성함 검색"
          className="border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-300 w-64"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] max-h-[75vh] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-14">no</th>
              <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100">학교명</th>
              <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-24">지역1</th>
              <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-24">지역2</th>
              <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100">주소</th>
              <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-28">선생님</th>
              <th className="sticky top-0 z-10 px-4 py-2.5 text-center font-bold text-primary-700 bg-primary-50 border-b border-primary-100 w-44">아이디</th>
              <th className="sticky top-0 z-10 bg-primary-50 border-b border-primary-100 px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((teacher, index) => (
                <tr key={teacher.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-center text-gray-600">{index + 1}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{teacher.institutionName}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{teacher.region1}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{teacher.region2 ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{teacher.address ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{teacher.name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-800">{teacher.email ?? '미생성'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors whitespace-nowrap"
                      onClick={() => router.push(`/teachers/${teacher.id}/edit`)}
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">
                  등록된 선생님이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
