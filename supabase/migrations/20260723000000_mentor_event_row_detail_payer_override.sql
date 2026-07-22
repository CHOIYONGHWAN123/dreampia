-- mentor_event_row_detail 뷰의 강의료/재료비 입금자 컬럼이 CLAUDE.md의
-- "강사료/재료비 입금자" 규칙(event_rows에 값이 있으면 오버라이드, 없으면
-- mentor_occupation_programs 기본값 사용)을 반영하지 않고 있던 문제를 고친다.
--
-- 기존 뷰는 lecture_fee_payer_id는 event_rows 값만, material_fee_payer_id는
-- mentor_occupation_programs 값만 반환했다. 강사 앱의 "강의 정산" 화면에서
-- material_fee_payer_id로 재료비 정산 대상(=이 멘토가 입금자로 지정된 건인지)을
-- 판단해야 하는데, event_rows 레벨 오버라이드가 있는 건을 놓치면 정산 금액이
-- 틀어진다.

create or replace view public.mentor_event_row_detail
with (security_invoker = true) as
select
  er.id as event_row_id,
  er.mentor_id,
  er.start_time,
  er.end_time,
  er.target,
  er.classroom,
  er.instructor_waiting_room,
  er.headcount,
  er.session_headcount,
  er.lecture_fee,
  er.lecture_fee_after_tax,
  coalesce(er.lecture_fee_payer_id, mop.lecture_fee_payer_id) as lecture_fee_payer_id,
  er.preparing,
  er.attendance,
  er.criminal_background_check,
  e.id as event_id,
  e.name as event_name,
  e.notice,
  e.memo,
  e.student_rotation,
  c.name as campaign_name,
  ins.name as institution_name,
  ins.address as institution_address,
  ins.laptop_wifi_note,
  ins.indoor_shoes_note,
  ins.parking_note,
  opu.id as unit_id,
  opu.title as unit_title,
  opu.prep_by,
  opu.mentor_material_cost,
  opu.dreampia_material_cost,
  op.name as program_name,
  o.name as occupation_name,
  mentor.name as mentor_name,
  mentor.phone as mentor_phone,
  coalesce(er.material_fee_payer_id, mop.material_fee_payer_id) as material_fee_payer_id
from public.event_rows er
join public.events e on e.id = er.event_id
left join public.campaign c on c.id = e.campaign_id
left join public.institutions ins on ins.id = e.institution_id
left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
left join public.occupation_programs op on op.id = opu.occupation_programs_id
left join public.occupations o on o.id = op.occupation_id
left join public.mentors mentor on mentor.id = er.mentor_id
left join public.mentor_occupation_programs mop
  on mop.mentor_id = er.mentor_id and mop.occupation_program_unit_id = er.occupation_program_unit_id;

grant select on public.mentor_event_row_detail to authenticated;
