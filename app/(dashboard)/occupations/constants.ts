// 'use server' 파일에서는 상수를 export할 수 없으므로 별도 파일로 분리

export const SCHOOL_LEVELS = ['초등', '중고등', '유치원'] as const
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number]
