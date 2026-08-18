import { createServerSupabaseClient } from '@/lib/supabase-server'
import { TermsEditor } from '@/components/features/terms/TermsEditor'

export default async function TermsPage() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('terms')
    .select('service_terms, privacy_policy')
    .order('effective_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="p-8 bg-gray-50 min-h-full">
      <TermsEditor
        initialServiceTerms={data?.service_terms ?? ''}
        initialPrivacyPolicy={data?.privacy_policy ?? ''}
      />
    </div>
  )
}
