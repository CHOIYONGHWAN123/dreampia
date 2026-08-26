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
