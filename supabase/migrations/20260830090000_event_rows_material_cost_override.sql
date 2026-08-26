-- 재료비(mentor_material_cost/dreampia_material_cost)는 기본적으로 프로그램
-- (occupation_programs) 값을 그대로 따라가지만, 특이 행사는 회차(event_row)별로
-- 수기 오버라이드가 필요하다는 요청에 따라 event_rows에도 같은 이름의 컬럼을 추가한다.
-- null이면 프로그램 기본값을 계속 따라가고(자동 연동), 값이 있으면 이 행에서만
-- 오버라이드한다 — lecture_fee_payer_id/material_fee_payer_id와 동일한 패턴.
alter table public.event_rows
  add column mentor_material_cost integer,
  add column dreampia_material_cost integer;

-- 강사 웹(멘토 앱)이 그대로 쓰는 뷰/함수이므로 출력 컬럼명은 유지하고, 값만
-- event_rows 오버라이드 우선으로 coalesce한다.
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
  op.prep_by,
  coalesce(er.mentor_material_cost, op.mentor_material_cost) as mentor_material_cost,
  coalesce(er.dreampia_material_cost, op.dreampia_material_cost) as dreampia_material_cost,
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

create or replace function public.get_sub_mentor_event_row_detail(p_event_row_id uuid)
returns table (
  event_row_id              public.event_rows.id%TYPE,
  mentor_id                 public.event_rows.mentor_id%TYPE,
  start_time                public.event_rows.start_time%TYPE,
  end_time                  public.event_rows.end_time%TYPE,
  target                    public.event_rows.target%TYPE,
  classroom                 public.event_rows.classroom%TYPE,
  instructor_waiting_room   public.event_rows.instructor_waiting_room%TYPE,
  headcount                 public.event_rows.headcount%TYPE,
  session_headcount         public.event_rows.session_headcount%TYPE,
  lecture_fee               public.event_rows.lecture_fee%TYPE,
  lecture_fee_after_tax     public.event_rows.lecture_fee_after_tax%TYPE,
  lecture_fee_payer_id      public.event_rows.lecture_fee_payer_id%TYPE,
  preparing                 public.event_rows.preparing%TYPE,
  attendance                public.event_rows.attendance%TYPE,
  criminal_background_check public.event_rows.criminal_background_check%TYPE,
  event_id                  public.events.id%TYPE,
  event_name                public.events.name%TYPE,
  notice                    public.events.notice%TYPE,
  memo                      public.events.memo%TYPE,
  student_rotation          public.events.student_rotation%TYPE,
  institution_name          public.institutions.name%TYPE,
  institution_address       public.institutions.address%TYPE,
  laptop_wifi_note          public.institutions.laptop_wifi_note%TYPE,
  indoor_shoes_note         public.institutions.indoor_shoes_note%TYPE,
  parking_note              public.institutions.parking_note%TYPE,
  unit_id                   public.occupation_program_unit.id%TYPE,
  unit_title                public.occupation_program_unit.title%TYPE,
  prep_by                   public.occupation_programs.prep_by%TYPE,
  mentor_material_cost      public.occupation_programs.mentor_material_cost%TYPE,
  dreampia_material_cost    public.occupation_programs.dreampia_material_cost%TYPE,
  program_name              public.occupation_programs.name%TYPE,
  occupation_name           public.occupations.name%TYPE,
  mentor_name               public.mentors.name%TYPE,
  mentor_phone              public.mentors.phone%TYPE,
  material_fee_payer_id     public.event_rows.material_fee_payer_id%TYPE,
  crime_check_info          public.institutions.crime_check_info%TYPE
)
language sql
security definer
stable
set search_path = public
as $$
  select
    er.id,
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
    coalesce(er.lecture_fee_payer_id, mop.lecture_fee_payer_id),
    er.preparing,
    er.attendance,
    er.criminal_background_check,
    e.id,
    e.name,
    e.notice,
    e.memo,
    e.student_rotation,
    ins.name,
    ins.address,
    ins.laptop_wifi_note,
    ins.indoor_shoes_note,
    ins.parking_note,
    opu.id,
    opu.title,
    op.prep_by,
    coalesce(er.mentor_material_cost, op.mentor_material_cost),
    coalesce(er.dreampia_material_cost, op.dreampia_material_cost),
    op.name,
    o.name,
    mentor.name,
    mentor.phone,
    coalesce(er.material_fee_payer_id, mop.material_fee_payer_id),
    ins.crime_check_info
  from public.event_rows er
  join public.mentors mentor on mentor.id = er.mentor_id
  join public.events e on e.id = er.event_id
  left join public.institutions ins on ins.id = e.institution_id
  left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
  left join public.occupation_programs op on op.id = opu.occupation_programs_id
  left join public.occupations o on o.id = op.occupation_id
  left join public.mentor_occupation_programs mop
    on mop.mentor_id = er.mentor_id and mop.occupation_program_unit_id = er.occupation_program_unit_id
  where er.id = p_event_row_id
    and mentor.belongs_to = auth.uid();
$$;

grant execute on function public.get_sub_mentor_event_row_detail(uuid) to authenticated;
