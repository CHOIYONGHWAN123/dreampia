import { z } from 'zod'

export const institutionSchema = z.object({
  region1: z.string().min(1, '지역1을 입력해주세요.'),
  region2: z.string().optional(),
  name: z.string().min(1, '학교명을 입력해주세요.'),
  address: z.string().optional(),
  category: z.string().optional(),
  institution_type: z.string().optional(),
  teacher_name: z.string().optional(),
  admin_contact: z.string().optional(),
  instructor_waiting_room: z.string().optional(),
  has_elevator: z.boolean().optional(),
  floor_map_url: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  laptop_wifi_note: z.string().optional(),
  crime_check_method: z.string().optional(),
  crime_check_info: z.string().optional(),
  indoor_shoes_note: z.string().optional(),
  parking_note: z.string().optional(),
})

export type InstitutionFormData = z.infer<typeof institutionSchema>
