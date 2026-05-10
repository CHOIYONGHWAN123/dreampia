import { AnnouncementForm } from '@/components/features/announcements/AnnouncementForm'

export default function NewAnnouncementPage() {
  return (
    <div className="p-8">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공지사항 작성</h1>
      </div>
      <AnnouncementForm />
    </div>
  )
}
