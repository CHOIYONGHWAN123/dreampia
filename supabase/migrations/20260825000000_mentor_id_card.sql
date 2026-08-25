-- 멘토 신분증 사진. 다른 첨부파일(동의서/PPT/프로필)과 달리 민감한 신원정보라
-- public 버킷 + getPublicUrl() 방식을 쓰지 않는다. events 버킷의 견적서 파일과 동일하게
-- private 버킷 + createSignedUrl()로 열람한다. 그래서 이 컬럼엔 공개 URL이 아니라
-- 버킷 내부 경로만 저장된다(예: <mentor_id>/1234567890.jpg).

alter table public.mentors
  add column if not exists id_card_file_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'id-card',
  'id-card',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- 본인 폴더(auth.uid() 하위)에만 업로드/조회/수정/삭제 가능 — agreement-file 등과 동일 패턴.
drop policy if exists "id_card_self_all" on storage.objects;
create policy "id_card_self_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'id-card' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'id-card' and (storage.foldername(name))[1] = auth.uid()::text);

-- 관리자는 신원 확인을 위해 전체 열람 가능(업로드/삭제는 불가, 조회만).
drop policy if exists "id_card_admin_select" on storage.objects;
create policy "id_card_admin_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'id-card' and public.is_authenticated_admin());
