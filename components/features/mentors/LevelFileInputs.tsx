'use client'

// 선택된 교급들마다 PPT/프로필 파일을 각각 받는 입력 — 강사 추가 폼과 강사 관리의
// "프로그램 추가" 모달에서 공용으로 사용한다.
export function LevelFileInputs({
  levels,
  onPptChange,
  onProfileChange,
}: {
  levels: { schoolLevel: string }[]
  onPptChange: (schoolLevel: string, file: File | null) => void
  onProfileChange: (schoolLevel: string, file: File | null) => void
}) {
  if (!levels.length) return null

  return (
    <div className="space-y-2 pl-2 border-l-2 border-gray-200">
      {levels.map((l) => (
        <div key={l.schoolLevel} className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12 shrink-0">{l.schoolLevel} PPT</span>
            <input
              type="file"
              onChange={(e) => onPptChange(l.schoolLevel, e.target.files?.[0] ?? null)}
              className="text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12 shrink-0">{l.schoolLevel} 프로필</span>
            <input
              type="file"
              onChange={(e) => onProfileChange(l.schoolLevel, e.target.files?.[0] ?? null)}
              className="text-xs flex-1"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
