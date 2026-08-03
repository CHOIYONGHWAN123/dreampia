'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type RecruitingEventRow = {
  id: string
  startTime: string | null
  endTime: string | null
  target: string | null
  headcount: number | null
  unitId: string | null
  unitTitle: string
  occupationName: string
  mentorId: string | null
  mentorName: string | null
  activeInvitation: {
    id: string
    isAllApprovalRequired: boolean
    isAuto: boolean
  } | null
  exhausted: boolean
}

export type CandidateMentor = {
  id: string
  name: string
  score: number | null
  belongsToName: string | null
}

export type InvitationMentorSummary = {
  id: string
  mentorId: string
  mentorName: string
  status: string
  respondedAt: string | null
}

export type InvitationSummary = {
  id: string
  isAllApprovalRequired: boolean
  isAuto: boolean
  status: string
  expiresAt: string
  eventRowIds: string[]
  mentors: InvitationMentorSummary[]
}

export type RecruitingData = {
  eventName: string
  rows: RecruitingEventRow[]
  mentorsByUnit: Record<string, CandidateMentor[]>
  invitations: InvitationSummary[]
}

export async function getRecruitingData(eventId: string): Promise<RecruitingData> {
  const supabase = await createServerSupabaseClient()

  const [{ data: event }, { data: eventRowsData }] = await Promise.all([
    supabase.from('events').select('id, name').eq('id', eventId).single(),
    supabase
      .from('event_rows')
      .select('id, start_time, end_time, target, headcount, occupation_program_unit_id, mentor_id')
      .eq('event_id', eventId)
      .order('start_time'),
  ])

  if (!event) throw new Error('행사를 찾을 수 없습니다.')

  const eventRows = eventRowsData ?? []
  const rowIds = eventRows.map((r) => r.id)
  const unitIds = [...new Set(eventRows.map((r) => r.occupation_program_unit_id).filter(Boolean))] as string[]
  const mentorIdsFromRows = [...new Set(eventRows.map((r) => r.mentor_id).filter(Boolean))] as string[]

  const [unitsRes, programsRes, mopRes, invEventRowsRes] = await Promise.all([
    unitIds.length > 0
      ? supabase.from('occupation_program_unit').select('id, title, occupation_programs_id').in('id', unitIds)
      : Promise.resolve({ data: [] as { id: string; title: string; occupation_programs_id: string | null }[] }),
    unitIds.length > 0
      ? supabase.from('occupation_programs').select('id, occupation_id')
      : Promise.resolve({ data: [] as { id: string; occupation_id: string | null }[] }),
    unitIds.length > 0
      ? supabase
          .from('mentor_occupation_programs')
          .select('mentor_id, occupation_program_unit_id')
          .in('occupation_program_unit_id', unitIds)
      : Promise.resolve({ data: [] as { mentor_id: string; occupation_program_unit_id: string | null }[] }),
    rowIds.length > 0
      ? supabase.from('invitation_event_rows').select('event_row_id, invitation_id').in('event_row_id', rowIds)
      : Promise.resolve({ data: [] as { event_row_id: string | null; invitation_id: string }[] }),
  ])

  const units = unitsRes.data ?? []
  const programs = programsRes.data ?? []
  const occupationIds = [...new Set(programs.map((p) => p.occupation_id).filter(Boolean))] as string[]
  const { data: occupationsData } = occupationIds.length > 0
    ? await supabase.from('occupations').select('id, name').in('id', occupationIds)
    : { data: [] as { id: string; name: string }[] }

  const programMap = new Map(programs.map((p) => [p.id, p]))
  const occupationMap = new Map((occupationsData ?? []).map((o) => [o.id, o]))
  const unitMap = new Map(units.map((u) => [u.id, u]))

  const mentorIdsForCandidates = [...new Set((mopRes.data ?? []).map((m) => m.mentor_id))]
  const allMentorIds = [...new Set([...mentorIdsForCandidates, ...mentorIdsFromRows])]
  const { data: mentorsData } = allMentorIds.length > 0
    ? await supabase.from('mentors').select('id, name, score, belongs_to').in('id', allMentorIds)
    : { data: [] as { id: string; name: string; score: number | null; belongs_to: string | null }[] }
  const mentorMap = new Map((mentorsData ?? []).map((m) => [m.id, m]))

  const mentorsByUnit: Record<string, CandidateMentor[]> = {}
  for (const row of mopRes.data ?? []) {
    if (!row.occupation_program_unit_id) continue
    const mentor = mentorMap.get(row.mentor_id)
    if (!mentor) continue
    const list = mentorsByUnit[row.occupation_program_unit_id] ?? []
    list.push({
      id: mentor.id,
      name: mentor.name,
      score: mentor.score,
      belongsToName: mentor.belongs_to ? mentorMap.get(mentor.belongs_to)?.name ?? null : null,
    })
    mentorsByUnit[row.occupation_program_unit_id] = list
  }

  // event_row_id -> 관련된 invitation_id 목록, invitation_id -> 관련 event_row_id 목록
  const eventRowIdsByInvitation = new Map<string, Set<string>>()
  const invitationIdsByRow = new Map<string, Set<string>>()
  for (const ier of invEventRowsRes.data ?? []) {
    if (!ier.event_row_id) continue
    const rowSet = eventRowIdsByInvitation.get(ier.invitation_id) ?? new Set<string>()
    rowSet.add(ier.event_row_id)
    eventRowIdsByInvitation.set(ier.invitation_id, rowSet)
    const invSet = invitationIdsByRow.get(ier.event_row_id) ?? new Set<string>()
    invSet.add(ier.invitation_id)
    invitationIdsByRow.set(ier.event_row_id, invSet)
  }

  const invitationIds = [...eventRowIdsByInvitation.keys()]
  const { data: invitationsData } = invitationIds.length > 0
    ? await supabase
        .from('invitations')
        .select('id, status, is_all_approval_required, is_auto, expires_at')
        .in('id', invitationIds)
    : {
        data: [] as {
          id: string
          status: string
          is_all_approval_required: boolean
          is_auto: boolean
          expires_at: string
        }[],
      }
  const invitationMeta = new Map((invitationsData ?? []).map((inv) => [inv.id, inv]))

  // event_row_id -> 진행중(발송중)인 invitation
  const activeInvitationByRow = new Map<string, { id: string; isAllApprovalRequired: boolean; isAuto: boolean }>()
  // event_row_id -> 자동섭외 후보소진 여부(발송중인 초대가 없을 때만 의미 있음)
  const exhaustedRowIds = new Set<string>()
  for (const [rowId, invIds] of invitationIdsByRow) {
    let foundActive = false
    for (const invId of invIds) {
      const inv = invitationMeta.get(invId)
      if (!inv) continue
      if (inv.status === '발송중') {
        activeInvitationByRow.set(rowId, {
          id: inv.id,
          isAllApprovalRequired: inv.is_all_approval_required,
          isAuto: inv.is_auto,
        })
        foundActive = true
        break
      }
    }
    if (!foundActive && [...invIds].some((id) => invitationMeta.get(id)?.status === '후보소진')) {
      exhaustedRowIds.add(rowId)
    }
  }

  const { data: invMentorsData } = invitationIds.length > 0
    ? await supabase
        .from('invitation_mentors')
        .select('id, invitation_id, mentor_id, status, responded_at')
        .in('invitation_id', invitationIds)
    : { data: [] as { id: string; invitation_id: string; mentor_id: string; status: string; responded_at: string | null }[] }

  const invMentorIds = [...new Set((invMentorsData ?? []).map((m) => m.mentor_id))]
  const { data: invMentorNamesData } = invMentorIds.length > 0
    ? await supabase.from('mentors').select('id, name').in('id', invMentorIds)
    : { data: [] as { id: string; name: string }[] }
  const invMentorNameMap = new Map((invMentorNamesData ?? []).map((m) => [m.id, m.name]))

  const mentorsByInvitation = new Map<string, InvitationMentorSummary[]>()
  for (const im of invMentorsData ?? []) {
    const list = mentorsByInvitation.get(im.invitation_id) ?? []
    list.push({
      id: im.id,
      mentorId: im.mentor_id,
      mentorName: invMentorNameMap.get(im.mentor_id) ?? '-',
      status: im.status,
      respondedAt: im.responded_at,
    })
    mentorsByInvitation.set(im.invitation_id, list)
  }

  const invitations: InvitationSummary[] = invitationIds.map((id) => {
    const meta = invitationMeta.get(id)!
    return {
      id,
      isAllApprovalRequired: meta.is_all_approval_required,
      isAuto: meta.is_auto,
      status: meta.status,
      expiresAt: meta.expires_at,
      eventRowIds: [...(eventRowIdsByInvitation.get(id) ?? [])],
      mentors: mentorsByInvitation.get(id) ?? [],
    }
  })

  const rows: RecruitingEventRow[] = eventRows.map((r) => {
    const unit = r.occupation_program_unit_id ? unitMap.get(r.occupation_program_unit_id) : undefined
    const program = unit?.occupation_programs_id ? programMap.get(unit.occupation_programs_id) : undefined
    const occupation = program?.occupation_id ? occupationMap.get(program.occupation_id) : undefined
    return {
      id: r.id,
      startTime: r.start_time,
      endTime: r.end_time,
      target: r.target,
      headcount: r.headcount,
      unitId: r.occupation_program_unit_id,
      unitTitle: unit?.title ?? '-',
      occupationName: occupation?.name ?? '-',
      mentorId: r.mentor_id,
      mentorName: r.mentor_id ? mentorMap.get(r.mentor_id)?.name ?? null : null,
      activeInvitation: r.mentor_id ? null : activeInvitationByRow.get(r.id) ?? null,
      exhausted: !r.mentor_id && !activeInvitationByRow.has(r.id) && exhaustedRowIds.has(r.id),
    }
  })

  return { eventName: event.name, rows, mentorsByUnit, invitations }
}

export async function createInvitation(input: {
  eventId: string
  eventRowIds: string[]
  isAllApprovalRequired: boolean
  mentorIds: string[]
}): Promise<void> {
  if (input.eventRowIds.length === 0) throw new Error('선택된 일정이 없습니다.')
  if (input.mentorIds.length === 0) throw new Error('초대할 강사를 선택해주세요.')

  const supabase = await createServerSupabaseClient()

  // 모든수락은 한 명의 강사가 포함된 일정을 전부 소화해야 하므로, 선택한 일정끼리
  // 시간이 겹치면 애초에 어떤 강사도 수락할 수 없다 - 생성 단계에서 미리 막는다.
  if (input.isAllApprovalRequired) {
    const { data: selectedRows, error: rowsCheckErr } = await supabase
      .from('event_rows')
      .select('id, start_time, end_time')
      .in('id', input.eventRowIds)
    if (rowsCheckErr) throw new Error(rowsCheckErr.message)

    const rows = (selectedRows ?? []).map((r) => ({
      id: r.id,
      start: r.start_time ? new Date(r.start_time).getTime() : null,
      end: r.end_time ? new Date(r.end_time).getTime() : null,
    }))
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i]
        const b = rows[j]
        if (a.start === null || a.end === null || b.start === null || b.end === null) continue
        if (a.start < b.end && a.end > b.start) {
          throw new Error('선택한 일정끼리 시간이 겹쳐 모든수락으로 초대할 수 없습니다.')
        }
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: invitation, error: invErr } = await supabase
    .from('invitations')
    .insert({
      is_all_approval_required: input.isAllApprovalRequired,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()
  if (invErr) throw new Error(invErr.message)

  const { error: rowsErr } = await supabase
    .from('invitation_event_rows')
    .insert(input.eventRowIds.map((event_row_id) => ({ invitation_id: invitation.id, event_row_id })))
  if (rowsErr) throw new Error(rowsErr.message)

  const now = new Date().toISOString()
  const { error: mentorsErr } = await supabase
    .from('invitation_mentors')
    .insert(input.mentorIds.map((mentor_id) => ({ invitation_id: invitation.id, mentor_id, notified_at: now })))
  if (mentorsErr) throw new Error(mentorsErr.message)

  // 수동으로든 자동으로든 섭외를 시작했으니 이 행사는 더 이상 "섭외대기"가 아니다.
  const { error: statusErr } = await supabase
    .from('events')
    .update({ recruit_status: '섭외진행중' })
    .eq('id', input.eventId)
  if (statusErr) throw new Error(statusErr.message)

  if (user) {
    const { error: logErr } = await supabase
      .from('work_logs')
      .insert({ admin_id: user.id, event_id: input.eventId, task_type: '강사 섭외' })
    if (logErr) throw new Error(logErr.message)
  }

  // TODO: 초대된 멘토에게 푸시 알림 발송 (추후 구현)

  revalidatePath(`/events/${input.eventId}/recruiting`)
  revalidatePath('/my-tasks/recruiting')
}

// 자동 섭외: 가능한(등록+시간충돌없음+활동가능) 멘토 중 점수 1등에게만 발송하고,
// 거절/무응답(1시간) 시 DB 쪽(create_auto_invitation → advance_auto_invitation/
// decline_invitation/expire_stale_invitations)에서 알아서 다음 등수로 넘어간다.
// 관리자 앱은 시작만 시키고, 이후 진행은 전부 DB에서 처리된다(거절은 강사 앱에서
// 일어나므로 이 admin 앱 코드가 관여할 수 없다).
export async function createAutoInvitation(
  eventId: string,
  eventRowIds: string[],
  isAllApprovalRequired: boolean
): Promise<void> {
  if (eventRowIds.length === 0) throw new Error('선택된 일정이 없습니다.')

  const supabase = await createServerSupabaseClient()

  // 모든수락은 한 명의 강사가 선택된 일정을 전부 수락해야 하므로, 선택한 일정끼리
  // 시간이 겹치면 애초에 어떤 강사도 해당할 수 없다 - createInvitation과 동일한 사전 검증.
  if (isAllApprovalRequired) {
    const { data: selectedRows, error: rowsCheckErr } = await supabase
      .from('event_rows')
      .select('id, start_time, end_time')
      .in('id', eventRowIds)
    if (rowsCheckErr) throw new Error(rowsCheckErr.message)

    const rows = (selectedRows ?? []).map((r) => ({
      start: r.start_time ? new Date(r.start_time).getTime() : null,
      end: r.end_time ? new Date(r.end_time).getTime() : null,
    }))
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i]
        const b = rows[j]
        if (a.start === null || a.end === null || b.start === null || b.end === null) continue
        if (a.start < b.end && a.end > b.start) {
          throw new Error('선택한 일정끼리 시간이 겹쳐 모든수락으로 초대할 수 없습니다.')
        }
      }
    }
  }

  const { error } = await supabase.rpc('create_auto_invitation', {
    p_event_row_ids: eventRowIds,
    p_is_all_approval_required: isAllApprovalRequired,
  })
  if (error) throw new Error(error.message)

  // 자동 섭외를 시작했으니 이 행사는 더 이상 "섭외대기"가 아니다.
  const { error: statusErr } = await supabase
    .from('events')
    .update({ recruit_status: '섭외진행중' })
    .eq('id', eventId)
  if (statusErr) throw new Error(statusErr.message)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { error: logErr } = await supabase
      .from('work_logs')
      .insert({ admin_id: user.id, event_id: eventId, task_type: '강사 섭외' })
    if (logErr) throw new Error(logErr.message)
  }

  revalidatePath(`/events/${eventId}/recruiting`)
  revalidatePath('/my-tasks/recruiting')
}

// 관리자가 실수로 시작한 진행 중인 초대를 취소한다. invitations는 이미 '취소' 상태값이
// 있었지만(스키마상 예약만 되어 있고) 실제로 이 상태로 전환하는 경로가 없었다.
// 아직 응답하지 않은(대기) invitation_mentors도 함께 마감 처리해 더 이상 수락/거절할
// 수 없게 한다 — 이미 수락한 멘토가 있으면 그 초대는 애초에 '마감' 상태라 '발송중'
// 조건에 걸리지 않으므로 잘못 취소될 일이 없다.
export async function cancelInvitation(eventId: string, invitationId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error: invErr } = await supabase
    .from('invitations')
    .update({ status: '취소' })
    .eq('id', invitationId)
    .eq('status', '발송중')
  if (invErr) throw new Error(invErr.message)

  const { error: mentorsErr } = await supabase
    .from('invitation_mentors')
    .update({ status: '마감', responded_at: new Date().toISOString() })
    .eq('invitation_id', invitationId)
    .eq('status', '대기')
  if (mentorsErr) throw new Error(mentorsErr.message)

  revalidatePath(`/events/${eventId}/recruiting`)
}

// 관리자가 배정을 취소한다. 멘토 자기취소(cancel_event_row_assignment RPC)와 같은 패턴으로
// mentor_id/preparing/attendance만 초기화하고, 해당 배정의 근거가 된 초대(invitation_mentors)의
// 수락 기록은 건드리지 않는다 — 초대 단위라 되돌리면 같은 초대로 받은 다른 일정 상태까지 꼬일 수 있다.
// 관리자용이라 멘토 RPC와 달리 지난 일정도 취소를 허용한다.
export async function cancelAssignment(eventId: string, eventRowId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('event_rows')
    .update({ mentor_id: null, preparing: false, attendance: false })
    .eq('id', eventRowId)
  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/recruiting`)
}
