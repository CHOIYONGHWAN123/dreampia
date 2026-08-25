-- 관리자 목록에서 "비활성화" 대신 "삭제" 개념을 쓰기 위해 is_deleted 컬럼을 추가한다.
-- 실제로 지우지 않고 목록에서만 숨긴다(소프트 삭제) — events.sales_admin_id/comm_admin_id,
-- work_logs.admin_id 등 관리자를 참조하는 실제 업무 기록이 많아 하드 삭제는 FK 제약에 걸리기
-- 쉽다. institutions.is_deleted와 동일한 패턴.
alter table public.admins add column is_deleted boolean not null default false;
