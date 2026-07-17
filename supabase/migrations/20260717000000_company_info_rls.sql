-- company_info는 지금까지 마이그레이션 이력 없이(대시보드에서 수동으로) 생성되어
-- RLS가 꺼져 있었다. 회사 소개는 공개 정보이므로 조회는 로그인 여부와 무관하게
-- 누구나(anon 포함) 가능하게 하고, 수정은 기존과 동일하게 관리자만 가능하도록 제한한다.

alter table public.company_info enable row level security;

drop policy if exists "company_info_select" on public.company_info;
create policy "company_info_select" on public.company_info
  for select using (true);

drop policy if exists "company_info_write" on public.company_info;
create policy "company_info_write" on public.company_info
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());
