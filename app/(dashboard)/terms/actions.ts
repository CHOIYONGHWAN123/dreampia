'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function saveTermsField(
  field: 'service_terms' | 'privacy_policy',
  content: string
) {
  const supabase = await createServerSupabaseClient()

  const { data: existing } = await supabase
    .from('terms')
    .select('id')
    .order('effective_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('terms')
      .update({ [field]: content, effective_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('terms')
      .insert({ service_terms: '', privacy_policy: '', [field]: content })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/terms')
}
