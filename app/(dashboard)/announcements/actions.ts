'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createAnnouncement(title: string, content: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('announcements')
    .insert({ title, content })
  if (error) throw new Error(error.message)
  revalidatePath('/announcements')
}

export async function updateAnnouncement(id: string, title: string, content: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('announcements')
    .update({ title, content })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/announcements')
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/announcements')
}
