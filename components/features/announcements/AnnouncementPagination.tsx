import Link from 'next/link'

interface Props {
  currentPage: number
  totalPages: number
}

export function AnnouncementPagination({ currentPage, totalPages }: Props) {
  const getPageRange = () => {
    const delta = 2
    const start = Math.max(1, currentPage - delta)
    const end = Math.min(totalPages, currentPage + delta)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const pages = getPageRange()
  const baseClass = 'inline-flex items-center justify-center w-9 h-9 text-sm border rounded-lg transition-colors'
  const activeClass = 'bg-gray-900 text-white border-gray-900'
  const defaultClass = 'border-gray-200 text-gray-600 hover:bg-gray-50'
  const disabledClass = 'border-gray-100 text-gray-300 pointer-events-none'

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <Link
        href={`/announcements?page=${currentPage - 1}`}
        className={`${baseClass} ${currentPage === 1 ? disabledClass : defaultClass}`}
        aria-disabled={currentPage === 1}
      >
        ‹
      </Link>

      {pages[0] > 1 && (
        <>
          <Link href="/announcements?page=1" className={`${baseClass} ${defaultClass}`}>1</Link>
          {pages[0] > 2 && <span className="px-1 text-gray-400 text-sm">···</span>}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={`/announcements?page=${p}`}
          className={`${baseClass} ${p === currentPage ? activeClass : defaultClass}`}
        >
          {p}
        </Link>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="px-1 text-gray-400 text-sm">···</span>
          )}
          <Link href={`/announcements?page=${totalPages}`} className={`${baseClass} ${defaultClass}`}>
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={`/announcements?page=${currentPage + 1}`}
        className={`${baseClass} ${currentPage === totalPages ? disabledClass : defaultClass}`}
        aria-disabled={currentPage === totalPages}
      >
        ›
      </Link>
    </div>
  )
}
