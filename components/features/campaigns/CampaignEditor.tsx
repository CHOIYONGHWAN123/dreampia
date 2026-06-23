'use client'

import { useState, useTransition, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { createCampaign, updateCampaign } from '@/app/(dashboard)/campaigns/actions'

type Mode = 'editor' | 'html' | 'preview'

interface Props {
  id?: string
  initialName?: string
  initialContent?: string
}

export function CampaignEditor({ id, initialName = '', initialContent = '' }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initialName)
  const [mode, setMode] = useState<Mode>('html')
  const [htmlValue, setHtmlValue] = useState(initialContent)
  const [previewContent, setPreviewContent] = useState(initialContent)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      ImageExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'min-h-125 p-4 outline-none prose prose-sm max-w-none',
      },
    },
  })

  const switchMode = (next: Mode) => {
    const currentHtml = mode === 'editor' && editor ? editor.getHTML() : htmlValue
    if (mode === 'editor') setHtmlValue(currentHtml)
    if (next === 'preview') setPreviewContent(currentHtml)
    if (next === 'editor' && editor) editor.commands.setContent(currentHtml)
    setMode(next)
  }

  const handleSave = () => {
    if (!name.trim()) {
      alert('프로그램명을 입력해주세요.')
      return
    }
    const content = mode === 'editor' ? (editor?.getHTML() ?? '') : htmlValue
    startTransition(async () => {
      if (id) {
        await updateCampaign(id, name.trim(), content)
      } else {
        await createCampaign(name.trim(), content)
      }
      router.push('/campaigns')
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `campaigns/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: false })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
      if (mode === 'editor' && editor) {
        editor.chain().focus().setImage({ src: publicUrl }).run()
      } else {
        // HTML 모드: textarea에 img 태그 직접 삽입
        setHtmlValue(prev => prev + `<img src="${publicUrl}" />`)
      }
    } catch {
      alert('이미지 업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/campaigns')}
            className="text-xl text-gray-500 hover:text-gray-900 transition-colors leading-none"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? '프로그램 수정' : '프로그램 추가'}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 프로그램명 입력 */}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="프로그램명을 입력해주세요."
        className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-gray-400"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* 에디터 */}
      <div className="border border-gray-200 rounded">
        <div className={`flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap ${mode === 'preview' ? 'hidden' : ''}`}>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            title="굵게"
          >
            <span className="font-bold">가</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            title="기울임"
          >
            <span className="italic">가</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive('underline')}
            title="밑줄"
          >
            <span className="underline">가</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={editor?.isActive('strike')}
            title="취소선"
          >
            <span className="line-through">가</span>
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            active={editor?.isActive({ textAlign: 'left' })}
            title="왼쪽 정렬"
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            active={editor?.isActive({ textAlign: 'center' })}
            title="가운데 정렬"
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            active={editor?.isActive({ textAlign: 'right' })}
            title="오른쪽 정렬"
          >
            ≡
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList')}
            title="글머리 기호"
          >
            • 목록
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList')}
            title="번호 목록"
          >
            1. 목록
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive('blockquote')}
            title="인용"
          >
            &ldquo;&rdquo;
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="사진 삽입"
          >
            {isUploading ? '업로드 중...' : '사진'}
          </ToolbarButton>
        </div>

        <div className={mode === 'editor' ? '' : 'hidden'}>
          <EditorContent editor={editor} />
        </div>
        {mode === 'html' && (
          <textarea
            value={htmlValue}
            onChange={e => setHtmlValue(e.target.value)}
            className="w-full min-h-125 p-4 font-mono text-sm outline-none resize-none"
            spellCheck={false}
          />
        )}
        {mode === 'preview' && (
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:16px;}img{max-width:100%;}</style></head><body>${previewContent}</body></html>`}
            className="w-full border-0 min-h-125"
            title="미리보기"
            onLoad={e => {
              const body = e.currentTarget.contentDocument?.body
              if (body) e.currentTarget.style.height = body.scrollHeight + 'px'
            }}
          />
        )}

        <div className="flex justify-end border-t border-gray-200 bg-gray-50">
          {(['editor', 'html', 'preview'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`px-4 py-1.5 text-xs border-l border-gray-200 transition-colors ${
                mode === m ? 'bg-white font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {m === 'editor' ? 'Editor' : m === 'html' ? 'HTML' : '미리보기'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`px-2 py-1 text-sm rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 ${
        active ? 'bg-gray-200' : ''
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-5 bg-gray-300 mx-1 inline-block" />
}
