-- mentor_invitation_requests에 event_rows.mentor_id(배정 여부)를 추가한다.
-- 부분수락 초대는 같은 초대 안에서도 event_row마다 이미 다른 강사가 선점했는지가 다를 수 있어,
-- 멘토 앱에서 행별로 "이미 배정됨"과 "수락 가능"을 구분해서 보여줘야 한다.

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
  pc.experience_type,
  er.mentor_id as assigned_mentor_id
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
