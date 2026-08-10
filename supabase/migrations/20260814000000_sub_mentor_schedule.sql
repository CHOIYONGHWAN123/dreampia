-- 멘토 앱 "강의 일정" 화면에서 소속대표가 자신의 소속강사(mentors.belongs_to = 본인)
-- 확정 일정(event_rows.mentor_id가 채워진 건)을 함께 조회/열람할 수 있게 한다.
--
-- mentors/event_rows의 기존 RLS(본인 행만 조회)를 additive 정책으로 넓히는 대신,
-- search_mentors/get_mentor_names와 동일하게 SECURITY DEFINER 함수로 필요한 컬럼만
-- 제한 반환한다. mentors 테이블에는 주민번호/계좌번호 등 민감정보가 있어 RLS를 넓히면
-- 소속대표가 소속강사의 민감정보까지 열람 가능해지는 문제가 생기기 때문이다.
--
-- 반환 컬럼 타입은 %TYPE으로 실제 테이블 컬럼을 참조해서 event_rows/institutions 등이
-- 마이그레이션 이력 없이(대시보드에서) 만들어진 테이블이라 실제 타입을 알 수 없는 문제를 피한다.

-- ── 1. 목록(캘린더)용: 소속강사 전체의 확정 일정 ──────────────────────────
create or replace function public.get_sub_mentor_schedule()
returns table (
  event_row_id      public.event_rows.id%TYPE,
  mentor_id         public.event_rows.mentor_id%TYPE,
  mentor_name       public.mentors.name%TYPE,
  start_time        public.event_rows.start_time%TYPE,
  end_time          public.event_rows.end_time%TYPE,
  target            public.event_rows.target%TYPE,
  institution_name  public.institutions.name%TYPE,
  unit_title        public.occupation_program_unit.title%TYPE,
  program_name      public.occupation_programs.name%TYPE
)
language sql
security definer
stable
set search_path = public
as $$
  select
    er.id,
    er.mentor_id,
    m.name,
    er.start_time,
    er.end_time,
    er.target,
    ins.name,
    opu.title,
    op.name
  from public.event_rows er
  join public.mentors m on m.id = er.mentor_id
  join public.events e on e.id = er.event_id
  left join public.institutions ins on ins.id = e.institution_id
  left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
  left join public.occupation_programs op on op.id = opu.occupation_programs_id
  where m.belongs_to = auth.uid()
  order by er.start_time;
$$;

grant execute on function public.get_sub_mentor_schedule() to authenticated;

-- ── 2. 상세 화면용: mentor_event_row_detail과 동일한 컬럼을, 호출자가 그 일정의
--    배정 강사의 소속대표인 경우에만 반환 ──────────────────────────────────
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
  prep_by                   public.occupation_program_unit.prep_by%TYPE,
  mentor_material_cost      public.occupation_program_unit.mentor_material_cost%TYPE,
  dreampia_material_cost    public.occupation_program_unit.dreampia_material_cost%TYPE,
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
    opu.prep_by,
    opu.mentor_material_cost,
    opu.dreampia_material_cost,
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
