'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTransition, useEffect } from 'react'
import { institutionSchema, type InstitutionFormData } from '@/lib/validations/institution'
import { createInstitution, updateInstitution, deleteInstitution } from '@/app/(dashboard)/institutions/actions'

const CATEGORIES = ['유치원', '초등', '중등', '고등', '기관', '특수학교', '문화센터']

interface DaumPostcodeResult {
  sido: string
  sigungu: string
  roadAddress: string
  jibunAddress: string
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: { oncomplete: (data: DaumPostcodeResult) => void }) => { open: () => void }
    }
  }
}

interface Props {
  id?: string
  defaultValues?: InstitutionFormData
}

export function InstitutionForm({ id, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleting] = useTransition()
  const isEdit = !!id

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InstitutionFormData>({
    resolver: zodResolver(institutionSchema),
    defaultValues: defaultValues ?? { region1: '', region2: '', name: '', address: '', category: '' },
  })

  const address = watch('address')
  const region1 = watch('region1')
  const region2 = watch('region2')

  useEffect(() => {
    if (document.getElementById('daum-postcode-script')) return
    const script = document.createElement('script')
    script.id = 'daum-postcode-script'
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const handleAddressSearch = () => {
    if (!window.daum?.Postcode) return
    new window.daum.Postcode({
      oncomplete: (data) => {
        const fullAddress = data.roadAddress || data.jibunAddress
        setValue('address', fullAddress, { shouldValidate: true })
        setValue('region1', data.sido, { shouldValidate: true })
        setValue('region2', data.sigungu, { shouldValidate: true })
      },
    }).open()
  }

  const handleDelete = () => {
    if (!confirm('학교를 삭제하시겠습니까?')) return
    startDeleting(async () => {
      await deleteInstitution(id!)
      router.push('/institutions')
    })
  }

  const onSubmit = (data: InstitutionFormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateInstitution(id, data)
      } else {
        await createInstitution(data)
      }
      router.push('/institutions')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      {/* 학교명 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          학교명 <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          type="text"
          placeholder="예: 해운대초등학교"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* 기관 구분 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">기관 구분</label>
        <select
          {...register('category')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors bg-white text-gray-700"
        >
          <option value="">선택 안 함</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 주소 검색 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">주소</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={address ?? ''}
            readOnly
            placeholder="주소 찾기 버튼을 눌러 검색하세요."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 cursor-default outline-none"
          />
          <button
            type="button"
            onClick={handleAddressSearch}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            주소 찾기
          </button>
        </div>
      </div>

      {/* 지역1 / 지역2 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            지역1 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('region1')}
            type="text"
            placeholder="예: 부산광역시"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors"
          />
          {errors.region1 && (
            <p className="mt-1 text-xs text-red-500">{errors.region1.message}</p>
          )}
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">지역2</label>
          <input
            {...register('region2')}
            type="text"
            placeholder="예: 해운대구"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors"
          />
        </div>
      </div>

      {(region1 || region2) && (
        <p className="text-xs text-gray-400 -mt-3">
          주소 검색으로 자동 입력되었습니다. 필요 시 직접 수정할 수 있습니다.
        </p>
      )}

      {/* 버튼 */}
      <div className="flex items-center justify-between pt-2">
        {isEdit ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/institutions')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? '저장 중...' : isEdit ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
