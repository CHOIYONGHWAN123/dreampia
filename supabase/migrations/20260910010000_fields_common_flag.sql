-- 분야(fields)가 특정 행사구분에 매이지 않고 모든 행사구분에서 항상 노출되어야 하는
-- 경우(예: 현장운영자)를 위한 플래그. field_event_categories로 모든 행사구분을 일일이
-- 연결해두면 새 행사구분이 생길 때마다 링크를 빠뜨리기 쉬워, 대신 명시적 플래그로 관리한다.
alter table public.fields add column is_common boolean not null default false;
comment on column public.fields.is_common is 'true면 field_event_categories 연결과 무관하게 모든 행사구분에서 노출된다 (예: 현장운영자)';

-- 20260830160000에서 "현장운영자"를 별도 행사구분으로 시드했으나, 행사구분은 행사당
-- 하나만 선택 가능해 실제 행사구분(직업체험 등)과 양립할 수 없는 문제가 있었다.
-- 분야를 공통으로 전환하고, 더 이상 쓰이지 않는 전용 행사구분/연결은 정리한다.
-- (occupation_program_unit '00000000-0000-4000-a000-000000000005'는 access 함수들이
-- 참조하는 고정값이라 그대로 둔다.)
update public.fields set is_common = true where id = '00000000-0000-4000-a000-000000000002';
delete from public.field_event_categories where field_id = '00000000-0000-4000-a000-000000000002';
delete from public.event_categories where id = '00000000-0000-4000-a000-000000000001';
