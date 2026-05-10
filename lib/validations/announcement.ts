import { z } from 'zod'

export const announcementSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.'),
  content: z.string().min(1, '내용을 입력하세요.'),
})

export type AnnouncementFormData = z.infer<typeof announcementSchema>
