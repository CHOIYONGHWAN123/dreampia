'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  createPptTemplate,
  deletePptTemplateById,
  updatePptTemplate,
  type PptTemplateData,
} from '@/app/(dashboard)/ppt-templates/actions'

interface Form {
  name: string
  file: File | null
}

const EMPTY_FORM: Form = { name: '', file: null }

async function uploadTemplateFile(file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
  const filename = `${Date.now()}${ext ? `.${ext}` : ''}`
  const { error } = await supabase.storage.from('unit-ppt-templates').upload(filename, file)
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('unit-ppt-templates').getPublicUrl(filename)
  return data.publicUrl
}

function getFilenameFromUrl(url: string) {
  return url.split('/').pop() || url
}

export function PptTemplateManagement({ initialTemplates }: { initialTemplates: PptTemplateData[] }) {
  const [templates, setTemplates] = useState(initialTemplates)

  const [addPopup, setAddPopup] = useState(false)
  const [addForm, setAddForm] = useState<Form>(EMPTY_FORM)
  const addFileInputRef = useRef<HTMLInputElement>(null)

  const [editPopup, setEditPopup] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PptTemplateData | null>(null)
  const [editForm, setEditForm] = useState<Form>(EMPTY_FORM)
  const editFileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)

  const handleAddConfirm = async () => {
    if (!addForm.name.trim() || !addForm.file) {
      alert('양식 이름과 파일을 모두 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const fileUrl = await uploadTemplateFile(addForm.file)
      await createPptTemplate(addForm.name.trim(), fileUrl)
      setTemplates(prev => [
        { id: crypto.randomUUID(), name: addForm.name.trim(), file_url: fileUrl, created_at: new Date().toISOString() },
        ...prev,
      ])
      setAddPopup(false)
      setAddForm(EMPTY_FORM)
    } catch (e) {
      alert(e instanceof Error ? e.message : '등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const openEditPopup = (template: PptTemplateData) => {
    setEditingTemplate(template)
    setEditForm({ name: template.name, file: null })
    setEditPopup(true)
  }

  const handleEditConfirm = async () => {
    if (!editingTemplate || !editForm.name.trim()) {
      alert('양식 이름을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      let fileUrl = editingTemplate.file_url
      if (editForm.file) {
        fileUrl = await uploadTemplateFile(editForm.file)
      }
      await updatePptTemplate(editingTemplate.id, editForm.name.trim(), fileUrl)
      setTemplates(prev =>
        prev.map(t => (t.id === editingTemplate.id ? { ...t, name: editForm.name.trim(), file_url: fileUrl } : t))
      )
      setEditPopup(false)
      setEditingTemplate(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : '수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 삭제하시겠습니까? 이 양식을 쓰는 프로그램 유닛에서는 양식이 사라집니다.')) return
    await deletePptTemplateById(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">PPT 양식 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            멘토가 다운로드해서 채워 넣는 빈 PPT 양식 목록입니다. 프로그램 유닛 등록 시 여기서 하나를 골라 연결합니다.
          </p>
        </div>
        <button
          onClick={() => {
            setAddForm(EMPTY_FORM)
            setAddPopup(true)
          }}
          className="px-4 py-1.5 bg-primary-500 text-white rounded-full text-sm font-bold hover:bg-primary-600 transition-colors shrink-0"
        >
          양식 추가
        </button>
      </div>

      <div className="space-y-2 max-w-2xl">
        {templates.length > 0 ? (
          templates.map(template => (
            <div
              key={template.id}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-[0_8px_22px_rgba(20,20,40,0.05)] p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{template.name}</p>
                <a
                  href={template.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-700 underline truncate block mt-0.5"
                >
                  {getFilenameFromUrl(template.file_url)}
                </a>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => openEditPopup(template)}
                  className="px-3 py-1 text-sm border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_8px_22px_rgba(20,20,40,0.05)] py-16 text-center text-gray-400 text-sm">
            등록된 양식이 없습니다.
          </div>
        )}
      </div>

      {addPopup && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setAddPopup(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(20,20,40,0.15)] p-6 w-96"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-extrabold text-gray-900 mb-4">양식 추가</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="예: 초등_진로체험"
                className="w-full border border-gray-200 rounded-full px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={addForm.file?.name || ''}
                  className="flex-1 border border-gray-200 rounded-full px-3.5 py-2 text-sm bg-gray-50"
                />
                <button
                  onClick={() => addFileInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 shrink-0"
                >
                  파일
                </button>
                <input
                  ref={addFileInputRef}
                  type="file"
                  accept=".ppt,.pptx,.pdf"
                  className="hidden"
                  onChange={e => setAddForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                />
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={handleAddConfirm}
                disabled={saving}
                className="px-6 py-2 bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 text-sm disabled:opacity-50"
              >
                {saving ? '저장 중...' : '확인'}
              </button>
              <button
                onClick={() => setAddPopup(false)}
                className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {editPopup && editingTemplate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setEditPopup(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(20,20,40,0.15)] p-6 w-96"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-extrabold text-gray-900 mb-4">양식 수정</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-full px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-300"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={editForm.file?.name || getFilenameFromUrl(editingTemplate.file_url)}
                  className="flex-1 border border-gray-200 rounded-full px-3.5 py-2 text-sm bg-gray-50"
                />
                <button
                  onClick={() => editFileInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-primary-300 text-primary-600 rounded-full hover:bg-primary-50 shrink-0"
                >
                  파일
                </button>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept=".ppt,.pptx,.pdf"
                  className="hidden"
                  onChange={e => setEditForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                />
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={handleEditConfirm}
                disabled={saving}
                className="px-6 py-2 bg-primary-500 text-white rounded-full font-bold hover:bg-primary-600 text-sm disabled:opacity-50"
              >
                {saving ? '저장 중...' : '확인'}
              </button>
              <button
                onClick={() => setEditPopup(false)}
                className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
