-- tasks.admin_id 제거.
-- "나의 할일" 목록은 특정 admin_id에 배정하는 방식이 아니라, tasks가 참조하는 event의
-- comm_admin_id/sales_admin_id 중 로그인한 관리자와 일치하는 경우 조회 시점에 판단해 보여준다.

drop index if exists public.tasks_admin_id_idx;
alter table public.tasks drop column admin_id;
