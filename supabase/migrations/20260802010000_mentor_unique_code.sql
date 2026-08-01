-- 멘토 고유코드(5자리, 순번 기반 자동발급) 추가.
--
-- 신규 멘토가 소속 멘토(추천인)를 지정할 때 이름 검색 대신 이 코드로 찾도록 하기 위함.
-- 이름 검색은 개인정보 노출과 동명이인 문제가 있어서다. 순번 기반이라 간단하고 충돌 걱정이
-- 없다(랜덤 방식 대비). 시퀀스 default라 관리자 앱이든 강사 앱이든 어느 쪽에서 mentors row가
-- insert되든 항상 자동으로 부여된다 — 기존 행도 이 ALTER 한 번으로 순서대로 채워진다.
--
-- 코드→멘토 조회는 RLS 정책이 아니라 SECURITY DEFINER RPC로 제공한다. 일반 SELECT 정책으로
-- "코드가 일치하면 조회 허용"을 열면 필터 없는 select만으로 전체 멘토 목록이 노출되는 것과
-- 사실상 같아서, 원래 막으려던 문제(전체 명단 노출)가 재발한다. RPC는 코드와 정확히 일치하는
-- 1건만 반환해 이 문제를 피한다.

create sequence public.mentor_unique_code_seq start 1;

alter table public.mentors
  add column mentor_unique_code varchar not null unique
  default lpad(nextval('public.mentor_unique_code_seq')::text, 5, '0');

alter sequence public.mentor_unique_code_seq owned by public.mentors.mentor_unique_code;

create or replace function public.find_mentor_by_unique_code(p_code text)
returns table (id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select m.id, m.name
  from public.mentors m
  where m.mentor_unique_code = p_code
  limit 1;
$$;

grant execute on function public.find_mentor_by_unique_code(text) to anon, authenticated;
