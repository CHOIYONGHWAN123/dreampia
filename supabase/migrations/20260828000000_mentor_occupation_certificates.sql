-- 멘토가 분야 섹션(직종)별로 첨부하는 자격증 이미지. 한 직종에 여러 장 첨부할 수 있어
-- mentors 테이블 컬럼이 아니라 별도 테이블로 둔다(멘토당 여러 행, 직종별로 묶어서 조회).
-- 신분증/통장사본과 동일하게 이미지에 개인 자격 정보가 담기므로 private 버킷을 쓴다.

create table if not exists public.mentor_occupation_certificates (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  occupation_id uuid not null references public.occupations(id) on delete cascade,
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table public.mentor_occupation_certificates enable row level security;

drop policy if exists "mentor_occupation_certificates_self_all" on public.mentor_occupation_certificates;
create policy "mentor_occupation_certificates_self_all" on public.mentor_occupation_certificates
  for all to authenticated
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

drop policy if exists "mentor_occupation_certificates_admin_select" on public.mentor_occupation_certificates;
create policy "mentor_occupation_certificates_admin_select" on public.mentor_occupation_certificates
  for select to authenticated
  using (public.is_authenticated_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificate', 'certificate', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "certificate_self_all" on storage.objects;
create policy "certificate_self_all" on storage.objects for all to authenticated
  using (bucket_id = 'certificate' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'certificate' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "certificate_admin_select" on storage.objects;
create policy "certificate_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'certificate' and public.is_authenticated_admin());
