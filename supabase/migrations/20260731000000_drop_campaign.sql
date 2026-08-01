-- campaign(행사명/캠페인) 기능 완전 제거.
-- 실제로는 이벤트 7건이 전부 테스트용 캠페인 하나만 참조하고 있고, 나머지 12개 캠페인은
-- 어떤 행사에도 쓰이지 않아 앞으로도 사용하지 않기로 했다. event_categories가 이미
-- fields/program_categories/lesson_plans의 "행사 구분" 역할을 대체하고 있다.

-- mentor_event_row_detail 뷰가 campaign_name을 노출하고 있어 컬럼/테이블을 지우기 전에
-- 해당 컬럼을 제거한 뷰로 먼저 재생성한다 (컬럼 삭제는 CREATE OR REPLACE로 불가능해 재생성 필요).
drop view public.mentor_event_row_detail;

create view public.mentor_event_row_detail
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
left join public.institutions ins on ins.id = e.institution_id
left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
left join public.occupation_programs op on op.id = opu.occupation_programs_id
left join public.occupations o on o.id = op.occupation_id
left join public.mentors mentor on mentor.id = er.mentor_id
left join public.mentor_occupation_programs mop
  on mop.mentor_id = er.mentor_id and mop.occupation_program_unit_id = er.occupation_program_unit_id;

grant select on public.mentor_event_row_detail to authenticated;

alter table public.events drop column campaign_id;
drop table public.campaign;
