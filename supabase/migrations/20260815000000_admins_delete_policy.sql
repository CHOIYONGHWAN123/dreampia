-- 관리자 관리 화면에서 슈퍼관리자가 다른 관리자를 삭제할 수 있도록.
-- 기존 "슈퍼관리자 수정" UPDATE 정책과 동일한 조건.
create policy "슈퍼관리자 삭제" on public.admins
  for delete using (
    exists (select 1 from public.admins a where a.id = auth.uid() and a.is_super = true)
  );
