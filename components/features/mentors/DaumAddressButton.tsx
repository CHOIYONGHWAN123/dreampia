'use client'

import { useEffect } from 'react'

// InstitutionForm.tsx와 동일한 Window.daum 전역 선언 — 타입이 다르면 선언 충돌이 나므로 모양을 맞춘다.
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

// 다음 우편번호 서비스로 주소를 검색해 채워준다. https://postcode.map.daum.net
export function DaumAddressButton({ onComplete }: { onComplete: (address: string) => void }) {
  useEffect(() => {
    if (document.getElementById('daum-postcode-script')) return
    const script = document.createElement('script')
    script.id = 'daum-postcode-script'
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  const openPostcode = () => {
    if (!window.daum?.Postcode) return
    new window.daum.Postcode({
      oncomplete: (data) => onComplete(data.roadAddress || data.jibunAddress),
    }).open()
  }

  return (
    <button
      type="button"
      onClick={openPostcode}
      className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors shrink-0 whitespace-nowrap"
    >
      주소 검색
    </button>
  )
}
