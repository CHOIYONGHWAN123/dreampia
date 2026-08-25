-- 임시 디버그 함수(재사용). admins 테이블의 기존 RLS 정책 확인용 — 확인 후 바로 삭제한다.
create or replace function public.debug_list_policies(p_table text)
returns table (policyname text, cmd text, qual text, with_check text)
language sql
security definer
set search_path = public
as $$
  select policyname, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public' and tablename = p_table;
$$;
