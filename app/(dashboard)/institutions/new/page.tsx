import { InstitutionForm } from '@/components/features/institutions/InstitutionForm'

export default function InstitutionNewPage() {
  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">기관 추가</h1>
      </div>
      <InstitutionForm />
    </div>
  )
}
