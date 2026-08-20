-- 프로그램 유닛별 PPT 양식(빈 템플릿) 다운로드 기능.
--
-- mentor_occupation_programs.ppt_file_url은 멘토 개개인이 이미 작성해서 업로드한 파일이라
-- 이번 기능(멘토가 다운로드해서 채워 넣을 빈 양식)과는 다른 개념이다. 양식은 같은 유닛을
-- 맡는 모든 멘토에게 동일해야 하므로 유닛 하나당 하나, occupation_program_unit에 둔다.
-- (프로필 양식은 프로그램과 무관하게 앱 전체에서 공용이라 그대로 앱 번들 정적 파일로 둔다.)

alter table public.occupation_program_unit
  add column if not exists ppt_template_url text;

-- ── unit-ppt-templates 버킷 생성 ──────────────────────────────────────
-- PPT 양식 파일 저장 버킷 (공개 읽기, 관리자만 업로드/삭제) — estimates 버킷과 동일 패턴.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'unit-ppt-templates',
  'unit-ppt-templates',
  true,
  20971520, -- 20MB
  array[
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

drop policy if exists "unit_ppt_templates_insert" on storage.objects;
create policy "unit_ppt_templates_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'unit-ppt-templates'
    and public.is_authenticated_admin()
  );

drop policy if exists "unit_ppt_templates_update" on storage.objects;
create policy "unit_ppt_templates_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'unit-ppt-templates'
    and public.is_authenticated_admin()
  );

drop policy if exists "unit_ppt_templates_delete" on storage.objects;
create policy "unit_ppt_templates_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'unit-ppt-templates'
    and public.is_authenticated_admin()
  );

drop policy if exists "unit_ppt_templates_select" on storage.objects;
create policy "unit_ppt_templates_select" on storage.objects
  for select using (bucket_id = 'unit-ppt-templates');
