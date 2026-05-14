import { InstitutionForm } from '@/components/features/institutions/InstitutionForm'

export default function InstitutionNewPage() {
  return (
    <div className="p-8">
      <div className="pb-4 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학교 추가</h1>
      </div>
      <InstitutionForm />
    </div>
  )
}
