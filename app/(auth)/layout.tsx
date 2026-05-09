export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">드림피아</h1>
          <p className="text-sm text-gray-500 mt-1">관리자 시스템</p>
        </div>
        {children}
      </div>
    </div>
  )
}
