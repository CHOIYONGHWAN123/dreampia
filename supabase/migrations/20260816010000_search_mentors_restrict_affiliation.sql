-- search_mentors가 전체 멘토를 대상으로 검색되던 것을, 강사료/재료비 입금자 선택 등
-- 멘토 앱에서 실제로 고를 수 있어야 하는 범위(본인 + 내 소속강사)로 제한한다.
-- belongs_to는 20260814000000_sub_mentor_schedule.sql에서 도입된 소속강사 관계.

create or replace function public.search_mentors(q text default '')
returns table (id uuid, name text)
language sql
security definer
stable
set search_path = public
as $$
  select id, name
  from public.mentors
  where (id = auth.uid() or belongs_to = auth.uid())
    and (q = '' or name ilike '%' || q || '%')
  order by name
  limit 20;
$$;
