'use client'

import { useState } from 'react'
import { CompanyInfoEditor } from './CompanyInfoEditor'

function HtmlPreview({ html }: { html: string }) {
  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; }
  img { max-width: 100%; }
</style>
</head>
<body>${html}</body>
</html>`

  return (
    <iframe
      srcDoc={srcDoc}
      className="w-full border-0"
      style={{ minHeight: '400px' }}
      title="미리보기"
      onLoad={(e) => {
        const body = e.currentTarget.contentDocument?.body
        if (body) e.currentTarget.style.height = body.scrollHeight + 'px'
      }}
    />
  )
}

interface Props {
  initialContent: string
}

export function CompanyInfoView({ initialContent }: Props) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [content, setContent] = useState(initialContent)

  const handleSaved = (newContent: string) => {
    setContent(newContent)
    setMode('preview')
  }

  if (mode === 'edit') {
    return (
      <CompanyInfoEditor
        initialContent={content}
        onSaved={handleSaved}
        onCancel={() => setMode('preview')}
      />
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">회사소개</h1>
        <button
          onClick={() => setMode('edit')}
          className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
        >
          편집
        </button>
      </div>

      {/* 미리보기 */}
      {content ? (
        <HtmlPreview html={content} />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <p className="text-sm">아직 등록된 내용이 없습니다.</p>
          <button
            onClick={() => setMode('edit')}
            className="mt-3 text-sm text-gray-500 underline hover:text-gray-700"
          >
            편집하기
          </button>
        </div>
      )}
    </div>
  )
}
