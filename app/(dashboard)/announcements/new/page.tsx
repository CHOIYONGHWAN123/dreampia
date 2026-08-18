import { AnnouncementForm } from '@/components/features/announcements/AnnouncementForm'

export default function NewAnnouncementPage() {
  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">공지사항 작성</h1>
      </div>
      <AnnouncementForm />
    </div>
  )
}
