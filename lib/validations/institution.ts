import { z } from 'zod'

export const institutionSchema = z.object({
  region1: z.string().min(1, '지역1을 입력해주세요.'),
  region2: z.string().optional(),
  name: z.string().min(1, '학교명을 입력해주세요.'),
  address: z.string().optional(),
  category: z.string().optional(),
})

export type InstitutionFormData = z.infer<typeof institutionSchema>
