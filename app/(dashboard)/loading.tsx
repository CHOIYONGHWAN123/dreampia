export default function DashboardLoading() {
  return (
    <div className="p-9 flex flex-col gap-6 bg-gray-50 min-h-full animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 rounded-lg bg-gray-200" />
        <div className="h-4 w-72 rounded-lg bg-gray-100" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-3xl p-5 shadow-[0_10px_28px_rgba(20,20,40,0.06)] flex flex-col gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-100" />
            <div className="h-6 w-16 rounded-lg bg-gray-200" />
            <div className="h-3 w-20 rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-[0_10px_28px_rgba(20,20,40,0.06)] overflow-hidden">
        <div className="h-14 border-b border-gray-100 bg-gray-50" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-gray-50 last:border-0 flex items-center px-6">
            <div className="h-3 w-full max-w-md rounded-lg bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
