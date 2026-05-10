'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface BannerData {
  id: string
  name: string
  display_order: number
  link_url: string | null
  image_url: string | null
  created_at: string
}

export async function getBanners(): Promise<BannerData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as BannerData[]
}

export async function createBanner(
  name: string,
  imageUrl: string,
  linkUrl: string | null
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('banners')
    .insert({ name, image_url: imageUrl, link_url: linkUrl, display_order: 0 })
  if (error) throw new Error(error.message)
  revalidatePath('/banners')
}

export async function updateBannerData(
  id: string,
  name: string,
  imageUrl: string,
  linkUrl: string | null
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('banners')
    .update({ name, image_url: imageUrl, link_url: linkUrl })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/banners')
}

export async function deleteBannerById(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/banners')
}

export async function saveBannerSlots(
  assignments: Array<{ slotNumber: number; bannerId: string | null }>
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  // 모든 배너의 display_order를 0으로 초기화
  await supabase.from('banners').update({ display_order: 0 }).gt('display_order', 0)
  // 새 슬롯 할당
  for (const { slotNumber, bannerId } of assignments) {
    if (bannerId) {
      await supabase.from('banners').update({ display_order: slotNumber }).eq('id', bannerId)
    }
  }
  revalidatePath('/banners')
}
