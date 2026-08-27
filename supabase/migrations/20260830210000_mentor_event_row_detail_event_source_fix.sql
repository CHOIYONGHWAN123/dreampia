-- mentor_event_row_detail 뷰 / get_sub_mentor_event_row_detail RPC가 laptop_wifi_note/
-- indoor_shoes_note/parking_note/crime_check_info를 institutions(학교 마스터 기본값)에서
-- 가져오고 있었는데, 관리자 행사 등록 폼(EventForm.tsx)의 해당 필드들은 실제로는
-- events(행사별 값, 등록 시 institutions 기본값을 복사해오되 행사마다 따로 수정 가능)에
-- 저장된다. 두 값이 갈라지면(예: 이번 행사만 다르게 안내) 강사 앱이 institutions의 옛
-- 기본값을 계속 보여주는 버그가 있었다 — 실제로 한 행사에서 events.crime_check_info는
-- 채워져 있는데 institutions.crime_check_info는 null인 사례로 확인됨.
--
-- 겸사겸사 관리자 행사 등록 폼 왼쪽 컬럼에는 있지만 이 뷰/RPC에는 아예 없던 컬럼들
-- (행사구분명/대상학년/엘리베이터 유무/학교 배치도/범죄경력 진행방식/학교요청사항(행사
-- 전체)/교시 시간표)도 함께 추가한다. 기존 컬럼은 이름·순서를 그대로 두고 끝에만
-- 추가해야 뷰 CREATE OR REPLACE가 깨지지 않는다.

-- event_schedules는 마이그레이션 이력 없이(대시보드에서 직접) 생성된 테이블이라 RLS 상태를
-- 이력으로 확인할 수 없다. mentor_event_row_detail은 security_invoker 뷰라 호출한 강사 본인의
-- RLS로 이 서브쿼리도 평가되므로, event_notice_files(20260830080000)와 동일한 패턴으로
-- "배정된 강사 및 소속대표는 조회 가능" 정책을 추가로 얹는다(기존에 이미 허용하는 정책이
-- 있었더라도 permissive 정책은 OR로 합쳐지므로 중복 추가해도 안전하다).
alter table public.event_schedules enable row level security;

drop policy if exists "event_schedules_mentor_select" on public.event_schedules;
create policy "event_schedules_mentor_select" on public.event_schedules
  for select using (
    exists (
      select 1 from public.event_rows er
      where er.event_id = event_schedules.event_id and er.mentor_id = auth.uid()
    )
    or exists (
      select 1 from public.event_rows er
      join public.mentors m on m.id = er.mentor_id
      where er.event_id = event_schedules.event_id and m.belongs_to = auth.uid()
    )
  );

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
  e.laptop_wifi_note,
  e.indoor_shoes_note,
  e.parking_note,
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
  e.crime_check_info,
  ec.name as event_category_name,
  e.target_grade,
  e.has_elevator,
  e.floor_map_url,
  e.crime_check_method,
  e.school_request_note,
  (
    select jsonb_agg(
      jsonb_build_object('label', es.label, 'start_time', es.start_time, 'end_time', es.end_time)
      order by es.sort_order
    )
    from public.event_schedules es
    where es.event_id = e.id
  ) as event_schedules
from public.event_rows er
join public.events e on e.id = er.event_id
left join public.event_categories ec on ec.id = e.event_category_id
left join public.institutions ins on ins.id = e.institution_id
left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
left join public.occupation_programs op on op.id = opu.occupation_programs_id
left join public.occupations o on o.id = op.occupation_id
left join public.mentors mentor on mentor.id = er.mentor_id
left join public.mentor_occupation_programs mop
  on mop.mentor_id = er.mentor_id and mop.occupation_program_unit_id = er.occupation_program_unit_id;

grant select on public.mentor_event_row_detail to authenticated;

-- get_sub_mentor_event_row_detail은 RETURNS TABLE 시그니처를 바꾸므로(컬럼 추가) create or
-- replace로는 안 되고 drop 후 재생성해야 한다.
drop function if exists public.get_sub_mentor_event_row_detail(uuid);

create function public.get_sub_mentor_event_row_detail(p_event_row_id uuid)
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
  laptop_wifi_note          public.events.laptop_wifi_note%TYPE,
  indoor_shoes_note         public.events.indoor_shoes_note%TYPE,
  parking_note              public.events.parking_note%TYPE,
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
  crime_check_info          public.events.crime_check_info%TYPE,
  event_category_name       public.event_categories.name%TYPE,
  target_grade              public.events.target_grade%TYPE,
  has_elevator              public.events.has_elevator%TYPE,
  floor_map_url             public.events.floor_map_url%TYPE,
  crime_check_method        public.events.crime_check_method%TYPE,
  school_request_note       public.events.school_request_note%TYPE,
  event_schedules           jsonb
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
    e.laptop_wifi_note,
    e.indoor_shoes_note,
    e.parking_note,
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
    e.crime_check_info,
    ec.name,
    e.target_grade,
    e.has_elevator,
    e.floor_map_url,
    e.crime_check_method,
    e.school_request_note,
    (
      select jsonb_agg(
        jsonb_build_object('label', es.label, 'start_time', es.start_time, 'end_time', es.end_time)
        order by es.sort_order
      )
      from public.event_schedules es
      where es.event_id = e.id
    )
  from public.event_rows er
  join public.mentors mentor on mentor.id = er.mentor_id
  join public.events e on e.id = er.event_id
  left join public.event_categories ec on ec.id = e.event_category_id
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
