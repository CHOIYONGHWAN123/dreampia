-- ── estimates 버킷 생성 ────────────────────────────────────────────────
-- 견적서 파일 저장 버킷 (공개 읽기, 관리자만 업로드/삭제)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'estimates',
  'estimates',
  true,
  10485760, -- 10MB
  array[
    'application/pdf',
    'application/vnd.hancom.hwp',
    'application/haansofthwp',
    'application/x-hwp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel'
  ]
)
on conflict (id) do nothing;

-- 관리자만 업로드 가능
drop policy if exists "estimates_insert" on storage.objects;
create policy "estimates_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'estimates'
    and public.is_authenticated_admin()
  );

-- 관리자만 삭제 가능
drop policy if exists "estimates_delete" on storage.objects;
create policy "estimates_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'estimates'
    and public.is_authenticated_admin()
  );

-- 공개 읽기 (버킷이 public이므로 URL로 직접 접근 가능)
drop policy if exists "estimates_select" on storage.objects;
create policy "estimates_select" on storage.objects
  for select using (bucket_id = 'estimates');
