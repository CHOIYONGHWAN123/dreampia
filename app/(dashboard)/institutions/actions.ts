'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// 기관을 실제로 지우지 않고 is_deleted만 true로 표시한다(소프트 삭제).
// 행사/재고로그 등 기존 기록을 그대로 보존하기 위함 — 목록/선택 화면에서는
// 제외하고, 이미 연결된 행사 등 과거 기록에는 "(삭제됨)"으로 표시한다.
export async function softDeleteInstitution(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').update({ is_deleted: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

export async function restoreInstitution(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').update({ is_deleted: false }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

type InstitutionData = {
  region1: string
  region2?: string
  name: string
  address?: string
  institution_type?: string
  admin_contact?: string
  instructor_waiting_room?: string
  has_elevator?: '있음' | '없음' | '확인필요'
  floor_map_url?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  laptop_wifi_note?: string
  crime_check_method?: string
  crime_check_info?: string
  indoor_shoes_note?: string
  parking_note?: string
}

function toPayload(data: InstitutionData) {
  return {
    region1: data.region1,
    region2: data.region2 || null,
    name: data.name,
    address: data.address || null,
    institution_type: data.institution_type || null,
    admin_contact: data.admin_contact || null,
    instructor_waiting_room: data.instructor_waiting_room || null,
    has_elevator: data.has_elevator ?? '확인필요',
    floor_map_url: data.floor_map_url || null,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    laptop_wifi_note: data.laptop_wifi_note || null,
    crime_check_method: data.crime_check_method || null,
    crime_check_info: data.crime_check_info || null,
    indoor_shoes_note: data.indoor_shoes_note || null,
    parking_note: data.parking_note || null,
  }
}

export async function updateInstitution(id: string, data: InstitutionData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').update(toPayload(data)).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

export async function createInstitution(data: InstitutionData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('institutions').insert(toPayload(data))
  if (error) throw new Error(error.message)
  revalidatePath('/institutions')
}

// 범죄경력회보서 조회 요청 알림 — 회보서를 아직 등록하지 않은, 이 행사에 배정된 강사에게
// Expo 푸시로 등록 요청을 보낸다. 재촉이 여러 번 필요할 수 있어 재발송 제한은 두지 않는다
// (crime_check_notified는 "한 번이라도 보냈는지" 표시용일 뿐 발송을 막지 않는다).
// mentor_devices/push_notifications는 멘토 본인만 RLS로 접근 가능해 관리자는 service-role
// 클라이언트로 조회/기록한다.
export async function sendCrimeCheckNotification(eventId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, institution_id, crime_check_method, crime_check_info')
    .eq('id', eventId)
    .single()
  if (eventError || !event) throw new Error(eventError?.message ?? '행사를 찾을 수 없습니다.')
  if (event.crime_check_method !== '회보서' || !event.crime_check_info?.trim()) {
    throw new Error('회보서 조회 요청을 보낼 수 없는 행사입니다.')
  }

  const { data: institution } = await supabase
    .from('institutions')
    .select('name')
    .eq('id', event.institution_id)
    .maybeSingle()

  const { data: rows, error: rowsError } = await supabase
    .from('event_rows')
    .select('mentor_id')
    .eq('event_id', eventId)
    .is('criminal_background_check', null)
    .not('mentor_id', 'is', null)
  if (rowsError) throw new Error(rowsError.message)

  const mentorIds = [...new Set((rows ?? []).map((r) => r.mentor_id as string))]
  if (mentorIds.length === 0) {
    throw new Error('회보서 등록이 필요한 배정 강사가 없습니다.')
  }

  const { createAdminSupabaseClient } = await import('@/lib/supabase-admin')
  const admin = createAdminSupabaseClient()

  const { data: devices, error: devicesError } = await admin
    .from('mentor_devices')
    .select('mentor_id, expo_push_token')
    .in('mentor_id', mentorIds)
  if (devicesError) throw new Error(devicesError.message)

  const title = `${institution?.name ?? '기관'} 범죄경력회보서 등록 요청`
  const body = `${event.name} 강의를 위한 회보서를 등록해주세요.`
  // url 쿼리파라미터(eventId)로 딥링크하면 멘토 앱의 회보서 나의 할일 화면이 이 행사 건을
  // 맨 위로 올리고 강조 표시한다(criminal-record-todo.tsx 참고).
  const notifyData = { url: `/criminal-record-todo?eventId=${eventId}`, eventId }

  const messages = (devices ?? []).map((d) => ({
    to: d.expo_push_token,
    title,
    body,
    data: notifyData,
    sound: 'default',
  }))

  let expoResult: unknown = null
  let sendError: string | null = null
  if (messages.length > 0) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-encoding': 'gzip, deflate' },
        body: JSON.stringify(messages),
      })
      expoResult = await res.json()
      if (!res.ok) sendError = JSON.stringify(expoResult)
    } catch (e) {
      sendError = e instanceof Error ? e.message : String(e)
    }
  }

  const logRows = mentorIds.map((mentorId) => {
    const hasDevice = (devices ?? []).some((d) => d.mentor_id === mentorId)
    return {
      mentor_id: mentorId,
      title,
      body,
      data: notifyData,
      expo_ticket: hasDevice ? expoResult : null,
      status: !hasDevice ? 'no_device' : sendError ? 'failed' : 'sent',
      error: hasDevice ? sendError : null,
    }
  })
  const { error: logError } = await admin.from('push_notifications').insert(logRows)
  if (logError) console.error('[sendCrimeCheckNotification] push_notifications insert failed', logError.message)

  if (sendError) throw new Error(`푸시 발송 중 오류가 발생했습니다: ${sendError}`)

  const { error: updateError } = await supabase.from('events').update({ crime_check_notified: true }).eq('id', eventId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath(`/institutions/${event.institution_id}`)
}

type SendEventNoticeResult = {
  // 실제로 기기가 등록돼 있어 푸시가 시도된 강사 수(mentorIds 중 mentor_devices가 있는 강사).
  notifiedCount: number
  // 이 행사에 배정된 전체 강사 수. notifiedCount보다 크면 일부가 기기 미등록이라는 뜻.
  targetMentorCount: number
  // 공지 등록 자체는 성공했지만 푸시 발송 중 일부 문제가 있었을 때만 채워진다.
  warning?: string
}

// 행사별 공지사항 — event_notices에 새 글을 남기고, 그 행사에 배정된 강사에게 Expo 푸시로
// 알린다. 전체 공지(announcements)와 달리 배정 강사만 볼 수 있고(RLS), 여러 번 보낼 수 있다.
// 현재 배정된 강사가 없어도 공지 자체는 등록한다 — 나중에 배정되는 강사도 지난 공지를 볼 수
// 있어야 하기 때문(event_notices_mentor_select 정책은 "현재 배정 여부"만 본다).
export async function sendEventNotice(
  eventId: string,
  title: string,
  content: string
): Promise<SendEventNoticeResult> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const trimmedTitle = title.trim()
  const trimmedContent = content.trim()
  if (!trimmedTitle || !trimmedContent) throw new Error('제목과 내용을 입력해주세요.')

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, institution_id')
    .eq('id', eventId)
    .single()
  if (eventError || !event) throw new Error(eventError?.message ?? '행사를 찾을 수 없습니다.')

  const { data: notice, error: insertError } = await supabase
    .from('event_notices')
    .insert({ event_id: eventId, title: trimmedTitle, content: trimmedContent, created_by: user.id })
    .select('id')
    .single()
  if (insertError || !notice) throw new Error(insertError?.message ?? '공지 등록에 실패했습니다.')

  if (event.institution_id) revalidatePath(`/institutions/${event.institution_id}`)

  const { data: rows, error: rowsError } = await supabase
    .from('event_rows')
    .select('mentor_id')
    .eq('event_id', eventId)
    .not('mentor_id', 'is', null)
  if (rowsError) throw new Error(rowsError.message)

  const mentorIds = [...new Set((rows ?? []).map((r) => r.mentor_id as string))]
  if (mentorIds.length === 0) {
    return { notifiedCount: 0, targetMentorCount: 0 }
  }

  const { createAdminSupabaseClient } = await import('@/lib/supabase-admin')
  const admin = createAdminSupabaseClient()

  const { data: devices, error: devicesError } = await admin
    .from('mentor_devices')
    .select('mentor_id, expo_push_token')
    .in('mentor_id', mentorIds)
  if (devicesError) throw new Error(devicesError.message)

  const pushTitle = `[${event.name}] ${trimmedTitle}`
  const pushBody = trimmedContent.length > 100 ? `${trimmedContent.slice(0, 100)}…` : trimmedContent
  const notifyData = { url: `/notice-detail?kind=event&id=${notice.id}` }

  const messages = (devices ?? []).map((d) => ({
    to: d.expo_push_token,
    title: pushTitle,
    body: pushBody,
    data: notifyData,
    sound: 'default',
  }))

  let expoResult: unknown = null
  let sendError: string | null = null
  if (messages.length > 0) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-encoding': 'gzip, deflate' },
        body: JSON.stringify(messages),
      })
      expoResult = await res.json()
      if (!res.ok) sendError = JSON.stringify(expoResult)
    } catch (e) {
      sendError = e instanceof Error ? e.message : String(e)
    }
  }

  const logRows = mentorIds.map((mentorId) => {
    const hasDevice = (devices ?? []).some((d) => d.mentor_id === mentorId)
    return {
      mentor_id: mentorId,
      title: pushTitle,
      body: pushBody,
      data: notifyData,
      expo_ticket: hasDevice ? expoResult : null,
      status: !hasDevice ? 'no_device' : sendError ? 'failed' : 'sent',
      error: hasDevice ? sendError : null,
    }
  })
  const { error: logError } = await admin.from('push_notifications').insert(logRows)
  if (logError) console.error('[sendEventNotice] push_notifications insert failed', logError.message)

  const notifiedMentorCount = new Set((devices ?? []).map((d) => d.mentor_id)).size

  if (sendError) {
    return {
      notifiedCount: 0,
      targetMentorCount: mentorIds.length,
      warning: `공지는 등록됐지만 푸시 발송 중 오류가 발생했습니다: ${sendError}`,
    }
  }
  return { notifiedCount: notifiedMentorCount, targetMentorCount: mentorIds.length }
}
