// institutions/events의 institution_type(유치원/초등/중등/고등/기관/특수학교/문화센터)을
// occupation_program_unit.school_level(초등/중고등/유치원)로 매핑한다. 기관/특수학교/문화센터처럼
// 특정 교급으로 단정할 수 없는 유형은 null을 반환해 필터링 없이 전체 프로그램을 보여준다.
const INSTITUTION_TYPE_TO_SCHOOL_LEVEL: Record<string, string> = {
  유치원: '유치원',
  초등: '초등',
  중등: '중고등',
  고등: '중고등',
}

export function institutionTypeToSchoolLevel(institutionType: string | null | undefined): string | null {
  if (!institutionType) return null
  return INSTITUTION_TYPE_TO_SCHOOL_LEVEL[institutionType] ?? null
}
