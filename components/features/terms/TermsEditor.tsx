'use client'

import { useState, useTransition } from 'react'
import { saveTermsField } from '@/app/(dashboard)/terms/actions'

interface Props {
  initialServiceTerms: string
  initialPrivacyPolicy: string
}

export function TermsEditor({ initialServiceTerms, initialPrivacyPolicy }: Props) {
  return (
    <div>
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">이용약관</h1>
      </div>

      <div className="space-y-10">
        <TermsSection
          index={1}
          label="서비스이용약관"
          field="service_terms"
          initialContent={initialServiceTerms}
        />
        <TermsSection
          index={2}
          label="개인정보취급방침"
          field="privacy_policy"
          initialContent={initialPrivacyPolicy}
        />
      </div>
    </div>
  )
}

function TermsSection({
  index,
  label,
  field,
  initialContent,
}: {
  index: number
  label: string
  field: 'service_terms' | 'privacy_policy'
  initialContent: string
}) {
  const [content, setContent] = useState(initialContent)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveTermsField(field, content)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 text-white text-xs font-bold">
            {index}
          </span>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isPending ? '저장 중...' : saved ? '저장됨 ✓' : '저장'}
        </button>
      </div>

      {/* 내용 입력 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-96 px-4 py-3 text-sm text-gray-700 outline-none resize-none leading-relaxed"
        placeholder={`${label} 내용을 입력하세요.`}
        spellCheck={false}
      />
    </div>
  )
}
