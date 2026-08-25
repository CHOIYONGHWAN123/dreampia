'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type AdminRow = {
  id: string
  name: string
  email: string
  phone: string | null
  isSuper: boolean
  isAuthenticated: boolean
  isSales: boolean
  isComm: boolean
  isDeleted: boolean
  approvedAt: string | null
  approvedByName: string | null
  createdAt: string
}

export async function getAdmins(): Promise<AdminRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('admins')
    .select('id, name, email, phone, is_super, is_authenticated, is_sales, is_comm, is_deleted, approved_by, approved_at, created_at')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  const approverIds = [...new Set((data ?? []).map((a) => a.approved_by).filter(Boolean))] as string[]
  const { data: approvers } = approverIds.length
    ? await supabase.from('admins').select('id, name').in('id', approverIds)
    : { data: [] as { id: string; name: string }[] }
  const approverMap = new Map((approvers ?? []).map((a) => [a.id, a.name]))

  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone,
    isSuper: a.is_super,
    isAuthenticated: a.is_authenticated,
    isSales: a.is_sales,
    isComm: a.is_comm,
    isDeleted: a.is_deleted,
    approvedAt: a.approved_at,
    approvedByName: a.approved_by ? (approverMap.get(a.approved_by) ?? null) : null,
    createdAt: a.created_at,
  }))
}

async function getCurrentAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')
  const { data: admin } = await supabase.from('admins').select('id, is_super').eq('id', user.id).single()
  if (!admin?.is_super) throw new Error('슈퍼관리자만 사용할 수 있습니다.')
  return { userId: user.id, admin }
}

// 슈퍼관리자가 0명이 되는 변경(마지막 슈퍼관리자의 슈퍼관리자 해제/삭제)을 막는다 -
// 아무도 다른 관리자를 승인/관리할 수 없는 상태에 빠지는 것을 방지.
async function assertKeepsAtLeastOneSuperAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  excludingId: string
) {
  const { count } = await supabase
    .from('admins')
    .select('id', { count: 'exact', head: true })
    .eq('is_super', true)
    .neq('id', excludingId)
  if ((count ?? 0) === 0) {
    throw new Error('마지막 남은 슈퍼관리자입니다. 다른 관리자를 슈퍼관리자로 지정한 뒤 다시 시도해주세요.')
  }
}

export async function approveAdmin(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { userId } = await getCurrentAdmin(supabase)

  const { error } = await supabase
    .from('admins')
    .update({ is_authenticated: true, approved_by: userId, approved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admins')
}

export async function updateAdminFields(
  id: string,
  fields: Partial<{ is_super: boolean; is_authenticated: boolean; is_sales: boolean; is_comm: boolean }>
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { userId } = await getCurrentAdmin(supabase)

  if (id === userId && (fields.is_super === false || fields.is_authenticated === false)) {
    throw new Error('본인 계정의 슈퍼관리자/인증 상태는 스스로 해제할 수 없습니다.')
  }
  if (fields.is_super === false) {
    await assertKeepsAtLeastOneSuperAdmin(supabase, id)
  }

  const { error } = await supabase.from('admins').update(fields).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admins')
}

// 관리자를 실제로 지우지 않고 is_authenticated=false, is_deleted=true로 표시한다(소프트 삭제).
// events.sales_admin_id/comm_admin_id, work_logs.admin_id 등 관리자를 참조하는 실제
// 업무 기록이 많아 하드 삭제는 FK 제약에 걸리기 쉽다. is_authenticated_admin() RLS
// 헬퍼가 is_authenticated=true인지만 확인하므로, false로 내리면 슈퍼관리자 여부와
// 무관하게 로그인·데이터 접근이 즉시 전부 차단된다. is_deleted는 목록 화면에서만
// 제외하는 용도(institutions.is_deleted와 동일한 패턴)로, 승인 대기(단순 is_authenticated=false)
// 상태와 구분하기 위해 별도로 둔다.
export async function deleteAdmin(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { userId } = await getCurrentAdmin(supabase)

  if (id === userId) {
    throw new Error('본인 계정은 삭제할 수 없습니다.')
  }

  const { data: target } = await supabase.from('admins').select('is_super').eq('id', id).single()
  if (target?.is_super) {
    await assertKeepsAtLeastOneSuperAdmin(supabase, id)
  }

  const { error } = await supabase.from('admins').update({ is_authenticated: false, is_deleted: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admins')
}

export async function restoreAdmin(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await getCurrentAdmin(supabase)

  const { error } = await supabase.from('admins').update({ is_deleted: false }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admins')
}
