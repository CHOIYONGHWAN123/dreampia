'use client'

import { FileDropZone } from './shared'

// 선택된 교급들마다 PPT/프로필 파일을 각각 받는 입력 — 강사 추가 폼과 강사 관리의
// "프로그램 추가" 모달에서 공용으로 사용한다.
export function LevelFileInputs({
  levels,
  pptFiles = {},
  profileFiles = {},
  onPptChange,
  onProfileChange,
}: {
  levels: { schoolLevel: string }[]
  pptFiles?: Record<string, File | null>
  profileFiles?: Record<string, File | null>
  onPptChange: (schoolLevel: string, file: File | null) => void
  onProfileChange: (schoolLevel: string, file: File | null) => void
}) {
  if (!levels.length) return null

  return (
    <div className="space-y-3 pl-2 border-l-2 border-gray-200">
      {levels.map((l) => (
        <div key={l.schoolLevel} className="space-y-2">
          <p className="text-xs font-medium text-gray-500">{l.schoolLevel}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">PPT</span>
                <a
                  href="/templates/ppt-template.pptx"
                  download="드림피아_PPT_양식.pptx"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                >
                  양식 다운로드
                </a>
              </div>
              <FileDropZone
                file={pptFiles[l.schoolLevel] ?? null}
                onChange={(file) => onPptChange(l.schoolLevel, file)}
                accept=".ppt,.pptx,.pdf"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">프로필</span>
                <a
                  href="/templates/profile-template.hwpx"
                  download="드림피아_프로필_양식.hwpx"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                >
                  양식 다운로드
                </a>
              </div>
              <FileDropZone
                file={profileFiles[l.schoolLevel] ?? null}
                onChange={(file) => onProfileChange(l.schoolLevel, file)}
                accept=".hwp,.hwpx,.pdf,.doc,.docx"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
