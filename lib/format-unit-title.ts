// 같은 프로그램 유닛이 school_level(초등/중고등/유치원)만 다르고 제목이 동일한 경우가 있어,
// 선택 목록/드롭다운에서 구분할 수 있도록 제목 뒤에 학교급을 괄호로 붙인다.
export function formatUnitTitle(title: string, schoolLevel: string | null | undefined): string {
  return schoolLevel ? `${title}(${schoolLevel})` : title
}
