export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-[0_20px_50px_rgba(20,20,40,0.08)] p-9">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">드림피아</h1>
            <span className="w-2 h-2 rounded-full bg-gold-500" />
          </div>
          <p className="text-sm text-gray-400 mt-1">관리자 시스템</p>
        </div>
        {children}
      </div>
    </div>
  )
}
