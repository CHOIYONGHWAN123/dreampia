-- 재료비/준비주체를 프로그램 유닛(occupation_program_unit) 단위에서
-- 프로그램(occupation_programs) 단위로 옮긴다. 재고(supplies)가 이미 프로그램
-- 단위로 관리되는 것과 같은 이유로, 같은 프로그램의 초등/중고등 유닛이 실제로는
-- 같은 재료를 같은 방식으로 준비하므로 유닛마다 값을 따로 둘 필요가 없다.
--
-- occupation_program_unit의 ppt_template_id는 행사구분(event_categories)의
-- 교급별 PPT 양식(elementary_ppt_template_id/secondary_ppt_template_id, 20260829080000)이
-- 대체하고 있고 실제 사용 중인 값이 0건이라 함께 제거한다.

-- ── 1. occupation_programs에 컬럼 추가 ────────────────────────────────

alter table public.occupation_programs
  add column if not exists mentor_material_cost integer,
  add column if not exists dreampia_material_cost integer,
  add column if not exists prep_by public.prep_by;

-- ── 2. occupation_program_unit → occupation_programs 백필 ─────────────
-- 같은 프로그램에 속한 유닛들의 값이 서로 다른 경우(중복 입력 등으로 실제 발견됨),
-- 채워진 값이 더 많은 쪽을 우선하고, 그래도 동률이면 더 최근에 생성된 유닛 값을 쓴다.

with ranked as (
  select
    occupation_programs_id,
    mentor_material_cost,
    dreampia_material_cost,
    prep_by,
    row_number() over (
      partition by occupation_programs_id
      order by
        (case when mentor_material_cost is not null then 1 else 0 end)
        + (case when dreampia_material_cost is not null then 1 else 0 end) desc,
        created_at desc
    ) as rn
  from public.occupation_program_unit
  where occupation_programs_id is not null
)
update public.occupation_programs op
set
  mentor_material_cost = r.mentor_material_cost,
  dreampia_material_cost = r.dreampia_material_cost,
  prep_by = r.prep_by
from ranked r
where r.occupation_programs_id = op.id
  and r.rn = 1;

-- ── 3. opu.prep_by/mentor_material_cost/dreampia_material_cost를 직접
--    참조하는 뷰/함수를 op(occupation_programs) 참조로 먼저 바꾼다.
--    (강사 웹의 강의 상세/정산 화면이 이 뷰·함수를 그대로 쓰므로 출력 컬럼명은 유지한다.)

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
  op.mentor_material_cost,
  op.dreampia_material_cost,
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
    op.mentor_material_cost,
    op.dreampia_material_cost,
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

-- ── 4. occupation_program_unit에서 컬럼 제거 ──────────────────────────

alter table public.occupation_program_unit
  drop column if exists mentor_material_cost,
  drop column if exists dreampia_material_cost,
  drop column if exists prep_by,
  drop column if exists ppt_template_id;
