-- 멘토 앱 "강의 상세" 화면에 기관의 회보서/동의서 인증 정보(기관아이디/검증번호)를
-- 표시하기 위해 institutions.crime_check_info를 mentor_event_row_detail 뷰에 노출한다.
--
-- events 테이블에도 같은 이름의 컬럼이 있어(행사별 오버라이드 가능) 값이 갈릴 수 있지만,
-- 멘토 앱에서는 명시적으로 기관(institutions) 쪽 값을 요구했으므로 institutions.crime_check_info만
-- 그대로 노출한다.
--
-- 이 뷰는 20260731000000_drop_campaign.sql에서 campaign_name을 제거하며 재생성된 최신
-- 버전을 기준으로 한다. 컬럼 추가만이라 CREATE OR REPLACE로 충분하다.

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
  coalesce(er.material_fee_payer_id, mop.material_fee_payer_id) as material_fee_payer_id,
  ins.crime_check_info
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
