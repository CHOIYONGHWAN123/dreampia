-- 멘토 온보딩 동의서를 실제 법정 서식 3종(성범죄 및 아동학대관련범죄 전력 조회 동의서,
-- 행정정보 공동이용 사전동의서, 강사계약서)으로 교체한다. 기존 더미 동의서
-- (agreement_file_url, 실제 법무 검토 전 임시 문구를 쓰던 단일 PDF)는 완전히 폐기하고
-- 이 3개 컬럼으로 대체한다. agreement_file_url이 채워져 있던 행은 전부 테스트 계정에서
-- 생성된 더미 데이터로 확인됐다(2026-08-25 기준 REST 조회).

alter table public.mentors drop column if exists agreement_file_url;

alter table public.mentors
  add column if not exists criminal_record_consent_file_url text,
  add column if not exists admin_info_consent_file_url text,
  add column if not exists contract_file_url text;

-- 위 3개 동의서는 주민등록번호가 PDF 본문에 그대로 찍히므로, id-card/bankbook과 동일하게
-- private 버킷 + signed URL 패턴을 쓴다. 기존 agreement-file(public) 버킷은 더 이상 쓰지 않는다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('consent-file', 'consent-file', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "consent_file_self_all" on storage.objects;
create policy "consent_file_self_all" on storage.objects for all to authenticated
  using (bucket_id = 'consent-file' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'consent-file' and (storage.foldername(name))[1] = auth.uid()::text);

-- 관리자는 열람뿐 아니라 수동 업로드도 할 수 있어야 한다: "강사 추가" 화면으로 만들어져
-- mentors.id != auth.uid()라 멘토 앱 자기서비스 흐름(서명)을 탈 수 없는 예외 계정들을 위해,
-- 기존 agreement-file 버킷에서 admin이 FileCell로 직접 업로드하던 것과 동일한 용도다.
drop policy if exists "consent_file_admin_all" on storage.objects;
create policy "consent_file_admin_all" on storage.objects for all to authenticated
  using (bucket_id = 'consent-file' and public.is_authenticated_admin())
  with check (bucket_id = 'consent-file' and public.is_authenticated_admin());
