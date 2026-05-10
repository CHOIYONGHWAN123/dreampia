'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  getBanners,
  createBanner,
  updateBannerData,
  deleteBannerById,
  saveBannerSlots,
  type BannerData,
} from '@/app/(dashboard)/banners/actions'

const ITEMS_PER_PAGE = 6
const TOTAL_SLOTS = 10

interface AddForm {
  name: string
  linkUrl: string
  imageFile: File | null
}

export function BannerManagement() {
  const [banners, setBanners] = useState<BannerData[]>([])
  const [slots, setSlots] = useState<(BannerData | null)[]>(Array(TOTAL_SLOTS).fill(null))
  const [rightPage, setRightPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // 선택 팝업
  const [selectPopup, setSelectPopup] = useState<{ open: boolean; slotIndex: number | null }>({
    open: false,
    slotIndex: null,
  })
  const [selectedBannerIdInPopup, setSelectedBannerIdInPopup] = useState<string | null>(null)

  // 추가 팝업
  const [addPopup, setAddPopup] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>({ name: '', linkUrl: '', imageFile: null })
  const addImageInputRef = useRef<HTMLInputElement>(null)

  // 수정 팝업
  const [editPopup, setEditPopup] = useState(false)
  const [editingBanner, setEditingBanner] = useState<BannerData | null>(null)
  const [editForm, setEditForm] = useState<AddForm>({ name: '', linkUrl: '', imageFile: null })
  const editImageInputRef = useRef<HTMLInputElement>(null)

  const loadBanners = useCallback(async () => {
    try {
      const data = await getBanners()
      setBanners(data)
      const newSlots: (BannerData | null)[] = Array(TOTAL_SLOTS).fill(null)
      data.forEach(banner => {
        if (banner.display_order >= 1 && banner.display_order <= TOTAL_SLOTS) {
          newSlots[banner.display_order - 1] = banner
        }
      })
      setSlots(newSlots)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBanners()
  }, [loadBanners])

  const totalPages = Math.ceil(banners.length / ITEMS_PER_PAGE)
  const pagedBanners = banners.slice((rightPage - 1) * ITEMS_PER_PAGE, rightPage * ITEMS_PER_PAGE)
  const usedBannerIds = new Set(slots.filter(Boolean).map(b => b!.id))
  const selectableBanners = banners.filter(b => !usedBannerIds.has(b.id))

  const handleSaveSlots = async () => {
    const assignments = slots.map((banner, i) => ({
      slotNumber: i + 1,
      bannerId: banner?.id || null,
    }))
    await saveBannerSlots(assignments)
    await loadBanners()
  }

  const openSelectPopup = (slotIndex: number) => {
    setSelectedBannerIdInPopup(null)
    setSelectPopup({ open: true, slotIndex })
  }

  const closeSelectPopup = () => {
    setSelectPopup({ open: false, slotIndex: null })
    setSelectedBannerIdInPopup(null)
  }

  const confirmSelect = () => {
    if (selectedBannerIdInPopup === null || selectPopup.slotIndex === null) return
    const banner = banners.find(b => b.id === selectedBannerIdInPopup) || null
    const newSlots = [...slots]
    newSlots[selectPopup.slotIndex] = banner
    setSlots(newSlots)
    closeSelectPopup()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return
    await deleteBannerById(id)
    await loadBanners()
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const supabase = createClient()
    const filename = `${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('banners').upload(filename, file)
    if (error) {
      alert('이미지 업로드에 실패했습니다.')
      return null
    }
    const { data } = supabase.storage.from('banners').getPublicUrl(filename)
    return data.publicUrl
  }

  const handleAddConfirm = async () => {
    if (!addForm.imageFile || !addForm.name.trim()) {
      alert('이미지 또는 배너명이 입력되지 않았습니다.')
      return
    }
    const imageUrl = await uploadImage(addForm.imageFile)
    if (!imageUrl) return
    await createBanner(addForm.name.trim(), imageUrl, addForm.linkUrl.trim() || null)
    setAddPopup(false)
    setAddForm({ name: '', linkUrl: '', imageFile: null })
    await loadBanners()
  }

  const openEditPopup = (banner: BannerData) => {
    setEditingBanner(banner)
    setEditForm({ name: banner.name, linkUrl: banner.link_url || '', imageFile: null })
    setEditPopup(true)
  }

  const handleEditConfirm = async () => {
    if (!editingBanner) return
    if (!editForm.name.trim() || (!editingBanner.image_url && !editForm.imageFile)) {
      alert('이미지 또는 배너명이 입력되지 않았습니다.')
      return
    }
    let imageUrl = editingBanner.image_url || ''
    if (editForm.imageFile) {
      const uploaded = await uploadImage(editForm.imageFile)
      if (!uploaded) return
      imageUrl = uploaded
    }
    await updateBannerData(editingBanner.id, editForm.name.trim(), imageUrl, editForm.linkUrl.trim() || null)
    setEditPopup(false)
    setEditingBanner(null)
    await loadBanners()
  }

  const getFilenameFromUrl = (url: string) => url.split('/').pop() || url

  if (loading) return <div className="p-8 text-gray-400 text-sm">로딩 중...</div>

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">배너 관리</h1>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* 왼쪽: 배너 등록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">배너 등록</span>
            <button
              onClick={handleSaveSlots}
              className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              저장
            </button>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {slots.map((banner, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 last:border-b-0"
              >
                <span className="text-sm text-gray-500 w-12 shrink-0">배너{i + 1}</span>
                <input
                  type="text"
                  readOnly
                  value={banner?.name || ''}
                  className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 bg-gray-50 text-gray-700"
                />
                <button
                  onClick={() => openSelectPopup(i)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors shrink-0"
                >
                  선택
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 배너 목록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">배너 목록</span>
            <button
              onClick={() => {
                setAddForm({ name: '', linkUrl: '', imageFile: null })
                setAddPopup(true)
              }}
              className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              추가
            </button>
          </div>
          <div className="space-y-2">
            {pagedBanners.length > 0 ? (
              pagedBanners.map(banner => (
                <div
                  key={banner.id}
                  className="flex items-center gap-3 border border-gray-200 rounded-lg p-3"
                >
                  <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden shrink-0">
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        없음
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">배너명: {banner.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      등록일:{' '}
                      {new Date(banner.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      링크: {banner.link_url || ''}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {usedBannerIds.has(banner.id) ? (
                      <span className="px-3 py-1 text-xs text-green-600 border border-green-600 rounded text-center">
                        사용중
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                      >
                        삭제
                      </button>
                    )}
                    <button
                      onClick={() => openEditPopup(banner)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      수정
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="border border-gray-200 rounded-lg py-16 text-center text-gray-400 text-sm">
                등록된 배너가 없습니다.
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setRightPage(i + 1)}
                  className={`w-8 h-8 text-sm rounded transition-colors ${
                    rightPage === i + 1
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              {rightPage < totalPages && (
                <button
                  onClick={() => setRightPage(p => Math.min(p + 1, totalPages))}
                  className="w-8 h-8 text-sm rounded text-gray-600 hover:bg-gray-100"
                >
                  &gt;
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 배너 선택 팝업 */}
      {selectPopup.open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={closeSelectPopup}
        >
          <div
            className="bg-white rounded-lg p-6 w-96 max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="w-10 py-2.5"></th>
                    <th className="py-2.5 text-center text-xs font-medium text-gray-500">배너명</th>
                  </tr>
                </thead>
                <tbody>
                  {selectableBanners.length > 0 ? (
                    selectableBanners.map(banner => (
                      <tr
                        key={banner.id}
                        className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedBannerIdInPopup(banner.id)}
                      >
                        <td className="py-2.5 text-center">
                          <input
                            type="radio"
                            checked={selectedBannerIdInPopup === banner.id}
                            onChange={() => setSelectedBannerIdInPopup(banner.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4">{banner.name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-10 text-center text-gray-400 text-xs">
                        선택 가능한 배너가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={confirmSelect}
                className="px-6 py-2 border border-gray-400 rounded hover:bg-gray-50 text-sm"
              >
                선택
              </button>
              <button
                onClick={closeSelectPopup}
                className="px-6 py-2 border border-gray-400 rounded hover:bg-gray-50 text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 배너 추가 팝업 */}
      {addPopup && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setAddPopup(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-96"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-medium mb-4">배너추가</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={addForm.imageFile?.name || ''}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                />
                <button
                  onClick={() => addImageInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-gray-900 rounded hover:bg-gray-50 shrink-0"
                >
                  이미지
                </button>
                <input
                  ref={addImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e =>
                    setAddForm(f => ({ ...f, imageFile: e.target.files?.[0] || null }))
                  }
                />
              </div>
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="배너명을 입력해주세요."
                className="w-full border border-green-500 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <input
                type="text"
                value={addForm.linkUrl}
                onChange={e => setAddForm(f => ({ ...f, linkUrl: e.target.value }))}
                placeholder="링크할 주소를 입력해주세요."
                className="w-full border border-green-500 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={handleAddConfirm}
                className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm"
              >
                확인
              </button>
              <button
                onClick={() => setAddPopup(false)}
                className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 배너 수정 팝업 */}
      {editPopup && editingBanner && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setEditPopup(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-96"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-medium mb-4">배너수정</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    editForm.imageFile?.name ||
                    (editingBanner.image_url
                      ? getFilenameFromUrl(editingBanner.image_url)
                      : '')
                  }
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                />
                <button
                  onClick={() => editImageInputRef.current?.click()}
                  className="px-3 py-2 text-sm border border-gray-900 rounded hover:bg-gray-50 shrink-0"
                >
                  이미지
                </button>
                <input
                  ref={editImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e =>
                    setEditForm(f => ({ ...f, imageFile: e.target.files?.[0] || null }))
                  }
                />
              </div>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="배너명을 입력해주세요."
                className="w-full border border-green-500 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <input
                type="text"
                value={editForm.linkUrl}
                onChange={e => setEditForm(f => ({ ...f, linkUrl: e.target.value }))}
                placeholder="링크할 주소를 입력해주세요."
                className="w-full border border-green-500 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={handleEditConfirm}
                className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm"
              >
                확인
              </button>
              <button
                onClick={() => setEditPopup(false)}
                className="px-6 py-2 border border-gray-900 rounded hover:bg-gray-50 text-sm"
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
