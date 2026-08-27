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

type EventUpdateData = {
  contract_type?: string | null
  contract_status?: string | null
  contract_delivered?: boolean | null
  event_check_status?: number | null
  institution_request_delivered?: boolean | null
  admin_docs_delivered?: boolean | null
  payment_confirmed?: boolean | null
  photo_sent?: boolean | null
  report_sent?: boolean | null
  group_chat_status?: string | null
  estimate_file_url?: string | null
  comm_admin_id?: string | null
  sales_admin_id?: string | null
  supplies_admin_id?: string | null
  contract_admin_id?: string | null
  recruit_admin_id?: string | null
  target_grade?: string | null
  budget?: number | null
  supplies_status?: string | null
  pre_notice_sent?: boolean | null
  recruit_status?: string | null
  recruit_delivered?: boolean | null
  teacher_name?: string | null
  remarks?: string | null
  inflow_source?: string | null
  final_budget?: number | null
  contract_memo?: string | null
  admin_docs?: string | null
  estimate_delivered?: boolean | null
  crime_check_delivered?: string | null
}

export async function updateEventField(eventId: string, data: EventUpdateData) {
  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('events').update(data as any).eq('id', eventId)
  if (error) throw new Error(error.message)
  revalidatePath('/event-operations')
}

export async function updateEventFieldAdmins(eventId: string, adminIds: string[]) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('events')
    .update({ field_admin_ids: adminIds })
    .eq('id', eventId)
  if (error) throw new Error(error.message)
  revalidatePath('/event-operations')
}
