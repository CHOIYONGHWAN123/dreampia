'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function updateCrimeCheckNotified(eventId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('events')
    .update({ crime_check_notified: true })
    .eq('id', eventId)
  if (error) throw new Error(error.message)
  revalidatePath('/event-operations')
}
