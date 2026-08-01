'use client'

type Institution = { id: string; name: string; created_at: string }

interface Props {
  mentorCount: number
  endedEventCount: number
  institutionCount: number
  institutions: Institution[]
}

function formatDateTimeKr(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function CounterDashboard({
  mentorCount,
  endedEventCount,
  institutionCount,
  institutions,
}: Props) {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">카운터 관리</h1>

      {/* ── 상단 stat 카드 ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '강사 수', value: mentorCount, sub: '등록된 강사 수' },
          { label: '행사 횟수', value: endedEventCount, sub: '종료된 행사 수' },
          { label: '기관 수', value: institutionCount, sub: '등록된 기관 수' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className="text-4xl font-bold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">{sub}</p>
          </div>
        ))}
      </div>

      {/* 기관 등록 내역 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">기관 등록 내역</h2>
        <div className="space-y-0 max-h-80 overflow-y-auto">
          {institutions.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">등록된 기관이 없습니다.</p>
          ) : (
            institutions.map((inst, i) => (
              <div
                key={inst.id}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{i + 1}</span>
                <span className="text-xs text-gray-500 shrink-0 font-mono">
                  {formatDateTimeKr(inst.created_at)}
                </span>
                <span className="text-xs text-gray-800 font-medium">{inst.name}</span>
                <span className="text-xs text-gray-400">등록</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
