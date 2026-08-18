import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { AnnouncementPagination } from '@/components/features/announcements/AnnouncementPagination'

const PAGE_SIZE = 10

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createServerSupabaseClient()
  const { data, count } = await supabase
    .from('announcements')
    .select('id, title, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">공지사항</h1>
        <Link
          href="/announcements/new"
          className="px-5 py-2 bg-primary-500 text-white rounded-full text-sm font-bold shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-primary-600 transition-colors"
        >
          작성
        </Link>
      </div>

      {/* 게시판 테이블 */}
      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 border-b border-primary-100">
            <tr>
              <th className="w-16 px-4 py-3 text-center text-xs font-bold text-primary-700">번호</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-primary-700">제목</th>
              <th className="w-32 px-4 py-3 text-center text-xs font-bold text-primary-700">작성일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data && data.length > 0 ? (
              data.map((item, index) => {
                const number = totalCount - from - index
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">{number}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/announcements/${item.id}`}
                        className="text-gray-800 hover:text-primary-600 hover:underline"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">
                      {new Date(item.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-16 text-center text-gray-400 text-sm">
                  등록된 공지사항이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <AnnouncementPagination currentPage={page} totalPages={totalPages} />
      )}
    </div>
  )
}
