import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
})

export const signupSchema = z
  .object({
    name: z.string().min(2, '이름은 2자 이상이어야 합니다.'),
    email: z.email('올바른 이메일 형식을 입력해주세요.'),
    password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
