// 'use server' 파일에서는 상수를 export할 수 없으므로 별도 파일로 분리

export const PREP_BY_OPTIONS = ['강사', '드림피아', '모두가능'] as const
export type PrepBy = (typeof PREP_BY_OPTIONS)[number]
