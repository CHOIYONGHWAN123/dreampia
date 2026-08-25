-- 멘토 통장사본. 신분증 사진(id-card)과 동일한 이유로 private 버킷에 저장한다.
-- mentors.bankbook_file_url에는 공개 URL이 아니라 버킷 내부 경로만 들어간다.

alter table public.mentors
  add column if not exists bankbook_file_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bankbook',
  'bankbook',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- 본인 폴더(auth.uid() 하위)에만 업로드/조회/수정/삭제 가능 — id-card와 동일 패턴.
drop policy if exists "bankbook_self_all" on storage.objects;
create policy "bankbook_self_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'bankbook' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'bankbook' and (storage.foldername(name))[1] = auth.uid()::text);

-- 관리자는 계좌 확인을 위해 전체 열람 가능(업로드/삭제는 불가, 조회만).
drop policy if exists "bankbook_admin_select" on storage.objects;
create policy "bankbook_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'bankbook' and public.is_authenticated_admin());
