import { z } from 'zod'

export const CRIME_CHECK_METHODS = ['회보서', '동의서'] as const
export const STUDENT_ROTATIONS = ['1교시마다 변경', '2교시마다 변경'] as const
export const INFLOW_SOURCES = [
  '팜플렛', '기존진행', '홈페이지', '블로그', '전화영업',
  '꿈길', '카카오톡채널', 'MOU', '입찰', '소개',
] as const
export const INSTITUTION_TYPES = ['유치원', '초등', '중등', '고등', '기관', '특수학교', '문화센터'] as const

const nullableString = z.string().optional().nullable()
const nullableEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().nullable()

export const eventSchema = z.object({
  reception_date: z.string().optional(),
  name: z.string().min(1, '행사명을 입력해주세요'),
  occupation_program_id: nullableString,
  institution_id: nullableString,
  event_start_at_date: z.string().optional(),
  event_start_at_time: z.string().optional(),
  event_end_at_date: z.string().optional(),
  event_end_at_time: z.string().optional(),
  target_grade: nullableString,
  laptop_wifi_note: nullableString,
  crime_check_method: nullableEnum(CRIME_CHECK_METHODS),
  crime_check_info: nullableString,
  indoor_shoes_note: nullableString,
  parking_note: nullableString,
  student_rotation: nullableEnum(STUDENT_ROTATIONS),
  notice: nullableString,
  prep_note: nullableString,
  memo: nullableString,
  schedule_1_start: z.string().optional(),
  schedule_1_end: z.string().optional(),
  schedule_2_start: z.string().optional(),
  schedule_2_end: z.string().optional(),
  schedule_lunch_start: z.string().optional(),
  schedule_lunch_end: z.string().optional(),
  contact_name: nullableString,
  contact_email: nullableString,
  contact_phone: nullableString,
  inflow_source: nullableEnum(INFLOW_SOURCES),
  institution_type: nullableEnum(INSTITUTION_TYPES),
  sales_admin_id: nullableString,
  budget: z.number().nullable().optional(),
  comm_admin_id: nullableString,
})

export type EventFormData = z.infer<typeof eventSchema>
