// 'use server' 파일에서는 상수를 export할 수 없으므로 별도 파일로 분리

export const SCHOOL_LEVELS = ['초등', '중고등', '유치원'] as const
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number]

export const LESSON_CATEGORIES = ['직업체험', '문화예술체험', '진로박람회'] as const
export type LessonCategory = (typeof LESSON_CATEGORIES)[number]

export const LESSON_GRADES = ['유치원', '초등학교', '중학교', '고등학교'] as const
export type LessonGrade = (typeof LESSON_GRADES)[number]

// Supabase Storage는 한글 경로를 허용하지 않으므로 ASCII 키로 변환
export const LESSON_CATEGORY_STORAGE_KEY: Record<LessonCategory, string> = {
  '직업체험': 'job',
  '문화예술체험': 'culture',
  '진로박람회': 'career',
}

export const LESSON_GRADE_STORAGE_KEY: Record<LessonGrade, string> = {
  '유치원': 'kindergarten',
  '초등학교': 'elementary',
  '중학교': 'middle',
  '고등학교': 'high',
}
