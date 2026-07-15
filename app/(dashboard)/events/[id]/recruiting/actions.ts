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
  } | null
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
        .select('id, status, is_all_approval_required, expires_at')
        .in('id', invitationIds)
    : { data: [] as { id: string; status: string; is_all_approval_required: boolean; expires_at: string }[] }
  const invitationMeta = new Map((invitationsData ?? []).map((inv) => [inv.id, inv]))

  // event_row_id -> 진행중(발송중)인 invitation
  const activeInvitationByRow = new Map<string, { id: string; isAllApprovalRequired: boolean }>()
  for (const [rowId, invIds] of invitationIdsByRow) {
    for (const invId of invIds) {
      const inv = invitationMeta.get(invId)
      if (inv && inv.status === '발송중') {
        activeInvitationByRow.set(rowId, { id: inv.id, isAllApprovalRequired: inv.is_all_approval_required })
        break
      }
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

  // TODO: 초대된 멘토에게 푸시 알림 발송 (추후 구현)

  revalidatePath(`/events/${input.eventId}/recruiting`)
}
