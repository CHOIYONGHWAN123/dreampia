-- 멘토 앱 "강의요청" 화면: 멘토가 초대(invitation)받은 event_row를 한 번에 조회하기 위한 뷰.
--
-- 문제: invitation_mentors/invitation_event_rows는 이미 RLS로 본인 초대만 보이지만,
-- event_rows/events는 아직 강사가 배정되기 전(mentor_id is null)이라 기존 RLS
-- ("멘토 본인 행 조회" mentor_id = auth.uid(), "승인된 관리자 조회")로는 초대받은 행 자체가
-- 안 보인다. 초대받은 event_row/그 상위 event만 추가로 열어주는 select 정책을 additive로 얹는다.

drop policy if exists "event_rows_invited_select" on public.event_rows;
create policy "event_rows_invited_select" on public.event_rows
  for select using (
    exists (
      select 1 from public.invitation_event_rows ier
      join public.invitation_mentors im on im.invitation_id = ier.invitation_id
      where ier.event_row_id = event_rows.id and im.mentor_id = auth.uid()
    )
  );

drop policy if exists "events_invited_select" on public.events;
create policy "events_invited_select" on public.events
  for select using (
    exists (
      select 1 from public.event_rows er
      join public.invitation_event_rows ier on ier.event_row_id = er.id
      join public.invitation_mentors im on im.invitation_id = ier.invitation_id
      where er.event_id = events.id and im.mentor_id = auth.uid()
    )
  );

-- ── 강의요청 목록 뷰 ───────────────────────────────────────────────────
-- security_invoker를 켜서 뷰를 select하는 세션(멘토 본인) 기준으로 아래 테이블들의
-- RLS가 그대로 적용되게 한다. invitation_mentors의 기존 정책(mentor_id = auth.uid())
-- 덕분에 별도 필터 없이 select만 해도 본인 초대만 반환된다.
create or replace view public.mentor_invitation_requests
with (security_invoker = true) as
select
  im.id as invitation_mentor_id,
  im.mentor_id,
  im.status as mentor_status,
  im.responded_at,
  i.id as invitation_id,
  i.is_all_approval_required,
  i.status as invitation_status,
  i.expires_at,
  er.id as event_row_id,
  er.start_time,
  er.end_time,
  er.target,
  er.classroom,
  er.headcount,
  er.session_headcount,
  er.lecture_fee,
  er.lecture_fee_after_tax,
  e.id as event_id,
  e.name as event_name,
  ins.name as institution_name,
  ins.address as institution_address,
  opu.id as unit_id,
  opu.title as unit_title,
  op.name as program_name,
  o.name as occupation_name,
  pc.experience_type
from public.invitation_mentors im
join public.invitations i on i.id = im.invitation_id
join public.invitation_event_rows ier on ier.invitation_id = i.id
join public.event_rows er on er.id = ier.event_row_id
join public.events e on e.id = er.event_id
left join public.institutions ins on ins.id = e.institution_id
left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
left join public.occupation_programs op on op.id = opu.occupation_programs_id
left join public.occupations o on o.id = op.occupation_id
left join public.program_categories pc on pc.id = opu.program_category_id;

grant select on public.mentor_invitation_requests to authenticated;
