-- 현장운영자(외부 인력, 기존 강사 섭외 알고리즘으로 배정) 기능을 위한 프로그램 체계 시드.
-- 기존 "현장담당"(events.field_admin_ids → admins, 관리자가 수동 지정)과는 완전히
-- 별개 개념이라 이름을 다르게 뒀다.
--
-- 행사구분/분야/직종/프로그램/유닛 전 계층을 "현장운영자" 하나로 통일해, 관리자가
-- 행사에 이 유닛으로 event_row를 만들면 기존 강사 섭외 알고리즘이 그대로 매칭한다.
-- id를 고정값으로 박아두는 이유: 이후 마이그레이션(RLS/RPC)에서 "이 유닛으로 배정된
-- mentor인가"를 판별할 안정적인 참조값이 필요한데, 관리자 UI(/programs)로 만들면
-- 랜덤 UUID가 되어 참조할 수 없다.

insert into public.event_categories (id, name)
values ('00000000-0000-4000-a000-000000000001', '현장운영자')
on conflict (id) do nothing;

insert into public.fields (id, name)
values ('00000000-0000-4000-a000-000000000002', '현장운영자')
on conflict (id) do nothing;

insert into public.field_event_categories (field_id, event_category_id)
values ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000001')
on conflict do nothing;

insert into public.occupations (id, field_id, name)
values ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000002', '현장운영자')
on conflict (id) do nothing;

insert into public.occupation_programs (id, occupation_id, name)
values ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000003', '현장운영자')
on conflict (id) do nothing;

insert into public.occupation_program_unit (id, occupation_programs_id, title)
values ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000004', '현장운영자')
on conflict (id) do nothing;
