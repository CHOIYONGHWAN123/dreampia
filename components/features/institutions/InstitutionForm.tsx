'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useTransition, useEffect, useRef, useState } from 'react'
import { institutionSchema, type InstitutionFormData } from '@/lib/validations/institution'
import { createInstitution, updateInstitution, deleteInstitution } from '@/app/(dashboard)/institutions/actions'
import { createClient } from '@/lib/supabase'

const CATEGORIES = ['유치원', '초등', '중등', '고등', '기관', '특수학교', '문화센터']
const INSTITUTION_TYPES = ['유치원', '초등', '중등', '고등', '기관'] as const
const CRIME_CHECK_METHODS = ['회보서', '동의서'] as const

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

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors'
const selectCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-gray-500 transition-colors bg-white text-gray-700'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

export function InstitutionForm({ id, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleting] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [floorMapFile, setFloorMapFile] = useState<File | null>(null)
  const floorMapInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!id

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InstitutionFormData>({
    resolver: zodResolver(institutionSchema),
    defaultValues: defaultValues ?? {
      region1: '', region2: '', name: '', address: '', category: '',
      institution_type: '', teacher_name: '', admin_contact: '',
      instructor_waiting_room: '', has_elevator: false, floor_map_url: '',
      contact_name: '', contact_email: '', contact_phone: '',
      laptop_wifi_note: '', crime_check_method: '', crime_check_info: '',
      indoor_shoes_note: '', parking_note: '',
    },
  })

  const address = watch('address')
  const region1 = watch('region1')
  const region2 = watch('region2')
  const hasElevator = watch('has_elevator')
  const existingFloorMapUrl = watch('floor_map_url')

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

  const uploadFloorMap = async (file: File): Promise<string> => {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `floor-maps/${id ?? Date.now()}.${ext}`
    const { error } = await supabase.storage.from('files').upload(path, file, { upsert: true })
    if (error) throw new Error(error.message)
    const { data: urlData } = supabase.storage.from('files').getPublicUrl(path)
    return urlData.publicUrl
  }

  const onSubmit = (data: InstitutionFormData) => {
    startTransition(async () => {
      let floorMapUrl = data.floor_map_url

      if (floorMapFile) {
        setIsUploading(true)
        try {
          floorMapUrl = await uploadFloorMap(floorMapFile)
        } catch {
          alert('배치도 파일 업로드에 실패했습니다.')
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      }

      try {
        const payload = { ...data, floor_map_url: floorMapUrl }
        if (isEdit) {
          await updateInstitution(id, payload)
        } else {
          await createInstitution(payload)
        }
        router.push('/institutions')
      } catch {
        alert('저장에 실패했습니다.')
      }
    })
  }

  const isBusy = isPending || isUploading

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      {/* 학교명 */}
      <div>
        <label className={labelCls}>학교명 <span className="text-red-500">*</span></label>
        <input {...register('name')} type="text" placeholder="예: 해운대초등학교" className={inputCls} />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* 기관 구분 */}
      <div>
        <label className={labelCls}>기관 구분</label>
        <select {...register('category')} className={selectCls}>
          <option value="">선택 안 함</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 기관 타입 */}
      <div>
        <label className={labelCls}>기관 타입</label>
        <select {...register('institution_type')} className={selectCls}>
          <option value="">선택 안 함</option>
          {INSTITUTION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* 주소 */}
      <div>
        <label className={labelCls}>주소</label>
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
          <label className={labelCls}>지역1 <span className="text-red-500">*</span></label>
          <input {...register('region1')} type="text" placeholder="예: 부산광역시" className={inputCls} />
          {errors.region1 && <p className="mt-1 text-xs text-red-500">{errors.region1.message}</p>}
        </div>
        <div className="flex-1">
          <label className={labelCls}>지역2</label>
          <input {...register('region2')} type="text" placeholder="예: 해운대구" className={inputCls} />
        </div>
      </div>

      {(region1 || region2) && (
        <p className="text-xs text-gray-400 -mt-3">
          주소 검색으로 자동 입력되었습니다. 필요 시 직접 수정할 수 있습니다.
        </p>
      )}

      {/* 담당 선생님 */}
      <div>
        <label className={labelCls}>담당 선생님</label>
        <input
          {...register('teacher_name')}
          type="text"
          placeholder="예: 3학년 부장 홍길동"
          className={inputCls}
        />
      </div>

      {/* 계약담당 행정실 연락처 */}
      <div>
        <label className={labelCls}>계약담당 행정실 연락처</label>
        <input {...register('admin_contact')} type="text" placeholder="예: 051-123-4567" className={inputCls} />
      </div>

      {/* 강사대기실 */}
      <div>
        <label className={labelCls}>강사대기실</label>
        <input
          {...register('instructor_waiting_room')}
          type="text"
          placeholder="예: 2층 2학년 학년연구실"
          className={inputCls}
        />
      </div>

      {/* 담당자 이름 */}
      <div>
        <label className={labelCls}>담당자 이름</label>
        <input {...register('contact_name')} type="text" placeholder="예: 홍길동" className={inputCls} />
      </div>

      {/* 담당자 이메일 */}
      <div>
        <label className={labelCls}>담당자 이메일</label>
        <input {...register('contact_email')} type="email" placeholder="예: hong@school.kr" className={inputCls} />
      </div>

      {/* 담당자 연락처 */}
      <div>
        <label className={labelCls}>담당자 연락처</label>
        <input {...register('contact_phone')} type="tel" placeholder="예: 010-1234-5678" className={inputCls} />
      </div>

      {/* 노트북/와이파이 */}
      <div>
        <label className={labelCls}>노트북/와이파이</label>
        <input {...register('laptop_wifi_note')} type="text" className={inputCls} />
      </div>

      {/* 범죄경력 진행방식 */}
      <div>
        <label className={labelCls}>범죄경력 진행방식</label>
        <select {...register('crime_check_method')} className={selectCls.replace('w-full', 'w-full')}>
          <option value="">선택 안 함</option>
          {CRIME_CHECK_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* 범죄경력회보서 */}
      <div>
        <label className={labelCls}>범죄경력회보서</label>
        <input {...register('crime_check_info')} type="text" placeholder="기관아이디/검증번호" className={inputCls} />
      </div>

      {/* 실내화(내빈화) 위치 */}
      <div>
        <label className={labelCls}>실내화(내빈화) 위치</label>
        <input {...register('indoor_shoes_note')} type="text" className={inputCls} />
      </div>

      {/* 주차 및 엘리베이터 */}
      <div>
        <label className={labelCls}>주차 및 엘리베이터</label>
        <input {...register('parking_note')} type="text" className={inputCls} />
      </div>

      {/* 엘리베이터 유무 */}
      <div>
        <label className={labelCls}>엘리베이터 유무</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setValue('has_elevator', true)}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              hasElevator === true
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            있음
          </button>
          <button
            type="button"
            onClick={() => setValue('has_elevator', false)}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              hasElevator === false && hasElevator !== undefined
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            없음
          </button>
        </div>
      </div>

      {/* 학교 배치도 */}
      <div>
        <label className={labelCls}>학교 배치도</label>
        <div className="space-y-2">
          {existingFloorMapUrl && !floorMapFile && (
            <a
              href={existingFloorMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-blue-500 underline"
            >
              현재 파일 보기
            </a>
          )}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={floorMapInputRef}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.hwp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setFloorMapFile(file)
              }}
            />
            <button
              type="button"
              onClick={() => floorMapInputRef.current?.click()}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {existingFloorMapUrl || floorMapFile ? '재업로드' : '파일 선택'}
            </button>
            {floorMapFile && (
              <span className="text-xs text-gray-500 truncate max-w-xs">{floorMapFile.name}</span>
            )}
          </div>
        </div>
      </div>

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
            disabled={isBusy}
            className="px-5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isBusy ? '저장 중...' : isEdit ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
