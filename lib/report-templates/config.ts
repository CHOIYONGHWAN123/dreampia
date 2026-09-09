// 행사구분(event_categories.name)별 결과보고서 문구/라벨 설정.
//
// public/report_templates/*.xlsx 원본 양식을 셀 단위로 대조해 옮겨온 값이다. 매핑 키는
// event_categories.name과 정확히 일치해야 하며, 실제 운영 DB에는 "직업특강"이 아니라
// "직업인특강"으로 등록되어 있어 그 값을 키로 쓴다(표시 문구는 원본 양식 그대로 "직업특강").
//
// 진로박람회는 양식 파일 자체가 직업체험 양식을 복붙한 오류 상태라 지원 대상에서 제외했고,
// 뮤지컬/연극 계열(연극공연·뮤지컬공연·뮤지컬갈라쇼)과 드림콘서트는 "프로그램 세부 운영
// 내용"(공연 종목 단위)과 "활동 내용"(공연+비공연 활동 단위)의 그룹 기준이 서로 달라 별도
// 확인이 필요해 2단계로 미룬다.
export type CategoryReportConfig = {
  /** 제목/섹션2·4 헤더에 쓰이는 행사구분 표시명 (원본 양식 문구 그대로) */
  displayName: string
  /** 섹션2 "프로그램" 열 값 (예: 진로체험) */
  programLabel: string
  /** 섹션2 "세부내용" 열 고정 서술 */
  section2Description: string
  /** 섹션1 "운영장소" 값 — 기관명을 채워 문구 완성 */
  venueTemplate: (institutionName: string) => string
  /** 섹션4 "직업군"/"프로그램" 헤더 라벨 */
  activityGroupLabel: string
  /** 섹션4 사진 아래 서술 라벨 ("체험내용"/"활동내용") */
  experienceLabel: string
}

export const REPORT_CATEGORY_CONFIG: Record<string, CategoryReportConfig> = {
  직업체험: {
    displayName: '직업체험',
    programLabel: '진로체험',
    section2Description:
      '전문 직업인과의 만남\n현직 실무 능력에 대한 강의와 평소 직업에 대해 궁금했던 점 Q&A 시간\n일일 직업체험 진행',
    venueTemplate: (institutionName) => `${institutionName} 각 교실`,
    activityGroupLabel: '직업군',
    experienceLabel: '체험내용',
  },
  직업인특강: {
    displayName: '직업특강',
    programLabel: '진로특강',
    section2Description:
      '전문 직업인과의 만남\n현직 실무 능력에 대한 강의와 평소 직업에 대해 궁금했던 점 Q&A 시간\n일일 직업체험 진행',
    venueTemplate: (institutionName) => `${institutionName} 각 교실`,
    activityGroupLabel: '직업군',
    experienceLabel: '활동내용',
  },
  문화예술체험: {
    displayName: '문화예술체험',
    programLabel: '문화예술체험',
    section2Description:
      '다양한 분야 예술 경험을 통한 예술\n감수성 및 심미적 감성 역량 함양\n일일 만들기 체험 진행',
    venueTemplate: (institutionName) => `${institutionName} 각 교실`,
    activityGroupLabel: '직업군',
    experienceLabel: '체험내용',
  },
}

export function getReportConfig(categoryName: string | null | undefined): CategoryReportConfig | null {
  if (!categoryName) return null
  return REPORT_CATEGORY_CONFIG[categoryName] ?? null
}
