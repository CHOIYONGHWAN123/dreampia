-- 관리자 웹에서 회보서(criminal_background_check) 파일을 대신 업로드할 수 있도록 허용.
--
-- criminal-background-check 버킷은 20260721010000_lecture_detail.sql에서 생성되었고,
-- 그때는 멘토 본인(자신에게 배정된 event_row 폴더)만 쓸 수 있는 정책만 만들었다.
-- 관리자가 행사 수정 화면에서 멘토를 대신해 파일을 올릴 수도 있어야 하므로
-- 관리자 전용 쓰기 정책을 별도로 추가한다 (읽기는 버킷이 public이라 정책 없이도 가능).

drop policy if exists "criminal_background_check_admin_write" on storage.objects;
create policy "criminal_background_check_admin_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'criminal-background-check'
    and public.is_authenticated_admin()
  )
  with check (
    bucket_id = 'criminal-background-check'
    and public.is_authenticated_admin()
  );
