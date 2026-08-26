-- 현장운영자(20260830160000에서 시드한 occupation_program_unit
-- '00000000-0000-4000-a000-000000000005') 열람 권한.
--
-- get_sub_mentor_event_row_detail(소속대표가 소속강사 일정을 보는 기존 기능)과 동일하게
-- SECURITY DEFINER 함수로 필요한 컬럼만 제한 반환하는 방식을 쓴다. events/event_rows/
-- mentors에 RLS를 추가로 얹는 대신 이 방식을 쓰는 이유는 두 가지다.
--   1) mentors에는 주민번호/계좌번호 등 민감정보가 있어 RLS를 넓히면 그 정보까지
--      열람 가능해진다 (강사등급도 여기 해당 — mentors.score).
--   2) events/institutions는 대시보드에서 직접 만들어진 정책이 섞여 있어(이력 추적 불가)
--      기존 RLS와의 상호작용을 예측하기 어렵다. SECURITY DEFINER 함수는 테이블 RLS를
--      우회해 함수 내부의 인가 조건 하나로만 통제되므로 이 문제를 피할 수 있다.
--
-- events에서 예산/견적서/거래명세서(budget, final_budget, estimate_file_url,
-- transaction_statement_file_url)는 제외하고 나머지 컬럼은 전부 반환한다(요구사항:
-- "예산/견적서/강사료/재료비/강사등급 제외한 모든 행사 정보 열람 가능"). 강사료/재료비/
-- 강사등급은 event_rows/mentors 쪽 함수에서 제외한다.

-- ── 1. 행사 상세 (예산/견적서/거래명세서 제외) ──────────────────────────────
create or replace function public.get_field_operator_event_detail(p_event_id uuid)
returns table (
  event_id                      public.events.id%TYPE,
  name                          public.events.name%TYPE,
  event_category_id             public.events.event_category_id%TYPE,
  occupation_program_id         public.events.occupation_program_id%TYPE,
  program_name                  public.occupation_programs.name%TYPE,
  requested_dates               public.events.requested_dates%TYPE,
  event_start_at                public.events.event_start_at%TYPE,
  event_end_at                  public.events.event_end_at%TYPE,
  target_grade                  public.events.target_grade%TYPE,
  laptop_wifi_note              public.events.laptop_wifi_note%TYPE,
  crime_check_method            public.events.crime_check_method%TYPE,
  crime_check_info              public.events.crime_check_info%TYPE,
  crime_check_status            public.events.crime_check_status%TYPE,
  indoor_shoes_note             public.events.indoor_shoes_note%TYPE,
  parking_note                  public.events.parking_note%TYPE,
  student_rotation              public.events.student_rotation%TYPE,
  notice                        public.events.notice%TYPE,
  prep_note                     public.events.prep_note%TYPE,
  school_request_note           public.events.school_request_note%TYPE,
  contact_name                  public.events.contact_name%TYPE,
  contact_email                 public.events.contact_email%TYPE,
  contact_phone                 public.events.contact_phone%TYPE,
  group_chat_link                public.events.group_chat_link%TYPE,
  teacher_name                  public.events.teacher_name%TYPE,
  admin_contact                 public.events.admin_contact%TYPE,
  instructor_waiting_room       public.events.instructor_waiting_room%TYPE,
  has_elevator                  public.events.has_elevator%TYPE,
  floor_map_url                 public.events.floor_map_url%TYPE,
  remarks                       public.events.remarks%TYPE,
  institution_id                public.institutions.id%TYPE,
  institution_name              public.institutions.name%TYPE,
  institution_region1           public.institutions.region1%TYPE,
  institution_region2           public.institutions.region2%TYPE,
  institution_address           public.institutions.address%TYPE
)
language sql
security definer
stable
set search_path = public
as $$
  select
    e.id,
    e.name,
    e.event_category_id,
    e.occupation_program_id,
    op.name,
    e.requested_dates,
    e.event_start_at,
    e.event_end_at,
    e.target_grade,
    e.laptop_wifi_note,
    e.crime_check_method,
    e.crime_check_info,
    e.crime_check_status,
    e.indoor_shoes_note,
    e.parking_note,
    e.student_rotation,
    e.notice,
    e.prep_note,
    e.school_request_note,
    e.contact_name,
    e.contact_email,
    e.contact_phone,
    e.group_chat_link,
    e.teacher_name,
    e.admin_contact,
    e.instructor_waiting_room,
    e.has_elevator,
    e.floor_map_url,
    e.remarks,
    ins.id,
    ins.name,
    ins.region1,
    ins.region2,
    ins.address
  from public.events e
  left join public.institutions ins on ins.id = e.institution_id
  left join public.occupation_programs op on op.id = e.occupation_program_id
  where e.id = p_event_id
    and exists (
      select 1 from public.event_rows fer
      where fer.event_id = e.id
        and fer.mentor_id = auth.uid()
        and fer.occupation_program_unit_id = '00000000-0000-4000-a000-000000000005'
    );
$$;

grant execute on function public.get_field_operator_event_detail(uuid) to authenticated;

-- ── 2. 행사의 전체 교시 목록 (강의료/재료비/강사등급 제외) ──────────────────
create or replace function public.get_field_operator_event_rows(p_event_id uuid)
returns table (
  event_row_id              public.event_rows.id%TYPE,
  mentor_id                 public.event_rows.mentor_id%TYPE,
  mentor_name                public.mentors.name%TYPE,
  mentor_phone               public.mentors.phone%TYPE,
  start_time                public.event_rows.start_time%TYPE,
  end_time                  public.event_rows.end_time%TYPE,
  target                    public.event_rows.target%TYPE,
  classroom                 public.event_rows.classroom%TYPE,
  instructor_waiting_room   public.event_rows.instructor_waiting_room%TYPE,
  headcount                 public.event_rows.headcount%TYPE,
  session_headcount         public.event_rows.session_headcount%TYPE,
  preparing                 public.event_rows.preparing%TYPE,
  attendance                public.event_rows.attendance%TYPE,
  remarks                   public.event_rows.remarks%TYPE,
  unit_title                public.occupation_program_unit.title%TYPE,
  program_name              public.occupation_programs.name%TYPE,
  occupation_name           public.occupations.name%TYPE
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
    m.phone,
    er.start_time,
    er.end_time,
    er.target,
    er.classroom,
    er.instructor_waiting_room,
    er.headcount,
    er.session_headcount,
    er.preparing,
    er.attendance,
    er.remarks,
    opu.title,
    op.name,
    o.name
  from public.event_rows er
  left join public.mentors m on m.id = er.mentor_id
  left join public.occupation_program_unit opu on opu.id = er.occupation_program_unit_id
  left join public.occupation_programs op on op.id = opu.occupation_programs_id
  left join public.occupations o on o.id = op.occupation_id
  where er.event_id = p_event_id
    and exists (
      select 1 from public.event_rows fer
      where fer.event_id = p_event_id
        and fer.mentor_id = auth.uid()
        and fer.occupation_program_unit_id = '00000000-0000-4000-a000-000000000005'
    )
  order by er.start_time;
$$;

grant execute on function public.get_field_operator_event_rows(uuid) to authenticated;

-- ── 3. 일반 강사용: 본인 일정의 그날 현장운영자 연락처 ──────────────────────
-- 요구사항 2: 섭외 완료된 강사가 강의상세에서 해당 일자 현장운영자 이름/연락처 확인.
-- 배정 없으면 빈 결과(0 rows) — 앱에서 "현장운영자 배정 없음"으로 표시.
create or replace function public.get_field_operator_contact(p_event_row_id uuid)
returns table (
  mentor_name  public.mentors.name%TYPE,
  mentor_phone public.mentors.phone%TYPE
)
language sql
security definer
stable
set search_path = public
as $$
  select fm.name, fm.phone
  from public.event_rows my
  join public.event_rows fer
    on fer.event_id = my.event_id
    and fer.occupation_program_unit_id = '00000000-0000-4000-a000-000000000005'
    and fer.mentor_id is not null
    and date(fer.start_time) = date(my.start_time)
  join public.mentors fm on fm.id = fer.mentor_id
  where my.id = p_event_row_id
    and my.mentor_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_field_operator_contact(uuid) to authenticated;
