// 금액 입력 필드에서 3자리마다 쉼표로 구분해 표시하기 위한 헬퍼
export function formatThousands(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return value.toLocaleString()
}

// 쉼표 등 숫자가 아닌 문자를 제거하고 숫자로 변환 (빈 값이면 null)
export function parseThousands(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, '')
  return digits === '' ? null : Number(digits)
}

const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
const KOREAN_SMALL_UNITS = ['', '십', '백', '천']
const KOREAN_BIG_UNITS = ['', '만', '억', '조']

function fourDigitsToKorean(num: number): string {
  let result = ''
  const str = String(num).padStart(4, '0')
  for (let i = 0; i < 4; i++) {
    const digit = Number(str[i])
    if (digit === 0) continue
    result += KOREAN_DIGITS[digit] + KOREAN_SMALL_UNITS[3 - i]
  }
  return result
}

// 계약금액 등을 "금 10,690,000 원(금 일천육십구만 원)"처럼 한글로 병기하기 위한 금액 변환.
// 조/억/만 단위로 4자리씩 끊어 변환하며, 십/백/천 자리에도 "일"을 그대로 붙이는
// 공식 문서(계약서·영수증) 표기 관례를 따른다 (예: 10 -> "일십", 100 -> "일백").
export function numberToKoreanWon(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return ''
  const isNegative = value < 0
  let n = Math.floor(Math.abs(value))
  const groups: string[] = []
  let unitIndex = 0
  while (n > 0) {
    const chunk = n % 10000
    if (chunk > 0) {
      groups.unshift(fourDigitsToKorean(chunk) + KOREAN_BIG_UNITS[unitIndex])
    }
    n = Math.floor(n / 10000)
    unitIndex++
  }
  return (isNegative ? '마이너스' : '') + groups.join('')
}
