-- admins 테이블 SELECT 정책이 "본인" 또는 "슈퍼관리자"만 허용하고 있어서,
-- 일반(비-슈퍼) 관리자는 영업담당자/소통담당자 드롭다운 등에 쓰이는
-- 다른 관리자 목록을 전혀 조회할 수 없었다(RLS에 막혀 빈 배열 반환).
-- 인증된 관리자라면 누구나 동료 관리자 목록(담당자 배정 등)을 볼 수 있어야 하므로
-- is_authenticated_admin() 기준의 전체 조회 정책을 추가한다.

create policy "인증된 관리자 전체 조회" on public.admins
  for select using (public.is_authenticated_admin());
