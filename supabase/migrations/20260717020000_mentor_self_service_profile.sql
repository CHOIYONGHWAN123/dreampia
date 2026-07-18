-- 멘토 앱에서 "승인 대기 중" 화면에 추가 정보(주민번호/주소/계좌번호/소속강사/동의서/프로그램)를
-- 셀프로 입력할 수 있게 한다. admin의 "강사 추가" 폼과 동일한 데이터를 다루되, 입력 주체가
-- 관리자가 아니라 승인 전 멘토 본인이라는 점이 다르다.

-- ── 1. 프로그램 카탈로그: 승인 여부와 무관하게 로그인한 사용자는 조회 가능 ──────
-- 기존 *_select 정책(is_authenticated_admin_or_mentor, 즉 승인된 멘토만)은 그대로 두고,
-- 승인 대기 중에도 카탈로그를 볼 수 있도록 additive 정책만 얹는다. 민감정보가 아닌
-- 커리큘럼 마스터 데이터라 승인 전 노출에 문제가 없다.

drop policy if exists "fields_select_authenticated" on public.fields;
create policy "fields_select_authenticated" on public.fields
  for select to authenticated using (true);

drop policy if exists "occupations_select_authenticated" on public.occupations;
create policy "occupations_select_authenticated" on public.occupations
  for select to authenticated using (true);

drop policy if exists "occupation_programs_select_authenticated" on public.occupation_programs;
create policy "occupation_programs_select_authenticated" on public.occupation_programs
  for select to authenticated using (true);

drop policy if exists "occupation_program_unit_select_authenticated" on public.occupation_program_unit;
create policy "occupation_program_unit_select_authenticated" on public.occupation_program_unit
  for select to authenticated using (true);

drop policy if exists "program_categories_select_authenticated" on public.program_categories;
create policy "program_categories_select_authenticated" on public.program_categories
  for select to authenticated using (true);

-- ── 2. 멘토 이름 검색 RPC (소속 강사 / 강사료·재료비 입금자 검색용) ─────────────
-- mentors 테이블은 주민번호/계좌번호 등 민감정보를 담고 있어 SELECT 정책을 넓히지 않는다.
-- 이름 검색에 필요한 id/name만 SECURITY DEFINER로 제한 반환한다.

create or replace function public.search_mentors(q text default '')
returns table (id uuid, name text)
language sql
security definer
stable
set search_path = public
as $$
  select id, name
  from public.mentors
  where q = '' or name ilike '%' || q || '%'
  order by name
  limit 20;
$$;

grant execute on function public.search_mentors(text) to authenticated;

-- 이미 선택된 멘토 id들의 이름을 조회할 때 사용 (예: 기존에 입력해둔 소속 강사/입금자 표시)
create or replace function public.get_mentor_names(ids uuid[])
returns table (id uuid, name text)
language sql
security definer
stable
set search_path = public
as $$
  select id, name from public.mentors where id = any(ids);
$$;

grant execute on function public.get_mentor_names(uuid[]) to authenticated;

-- ── 3. mentors 본인 행 수정 ────────────────────────────────────────────────
-- 승인 전 멘토가 본인 프로필(주소/주민번호/계좌번호/소속강사/동의서)을 채울 수 있어야 한다.
-- is_authenticated/score/is_available 등 관리자 전용 컬럼은 트리거로 방어한다
-- (테이블 전체 UPDATE 권한은 admin도 authenticated 세션으로 사용 중이라 GRANT를 좁히면
--  관리자의 기존 승인 기능이 깨지므로, 컬럼 단위 GRANT REVOKE 대신 트리거로 막는다).

drop policy if exists "mentors_self_update" on public.mentors;
create policy "mentors_self_update" on public.mentors
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.mentors_protect_admin_only_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_authenticated_admin() then
    new.is_authenticated := old.is_authenticated;
    new.is_available := old.is_available;
    new.score := old.score;
    new.user_id := old.user_id;
    new.terms_agreed_at := old.terms_agreed_at;
    new.terms_version_id := old.terms_version_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists mentors_protect_admin_only_columns on public.mentors;
create trigger mentors_protect_admin_only_columns
  before update on public.mentors
  for each row
  execute function public.mentors_protect_admin_only_columns();

-- ── 4. mentor_occupation_programs 본인 행 관리 ────────────────────────────
-- 기존 select/write(관리자 전용) 정책은 그대로 두고, 본인 mentor_id 행에 한해
-- 조회/추가/삭제(변경은 삭제 후 재추가)를 허용하는 정책을 additive로 얹는다.

drop policy if exists "mentor_occupation_programs_self_select" on public.mentor_occupation_programs;
create policy "mentor_occupation_programs_self_select" on public.mentor_occupation_programs
  for select using (mentor_id = auth.uid());

drop policy if exists "mentor_occupation_programs_self_insert" on public.mentor_occupation_programs;
create policy "mentor_occupation_programs_self_insert" on public.mentor_occupation_programs
  for insert to authenticated with check (mentor_id = auth.uid());

drop policy if exists "mentor_occupation_programs_self_delete" on public.mentor_occupation_programs;
create policy "mentor_occupation_programs_self_delete" on public.mentor_occupation_programs
  for delete using (mentor_id = auth.uid());

-- ── 5. 스토리지: 본인 폴더(auth.uid() 하위)에만 업로드 허용 ────────────────
-- agreement-file / ppt-file / profile-file 버킷은 이미 존재하며 public=true로 가정한다
-- (admin이 getPublicUrl()로 접근 중이라 이미 공개 버킷). 버킷 생성/공개 설정은 건드리지 않고
-- "본인 uid 하위 경로에만 쓸 수 있다"는 정책만 추가한다.

drop policy if exists "agreement_file_self_write" on storage.objects;
create policy "agreement_file_self_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'agreement-file' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'agreement-file' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ppt_file_self_write" on storage.objects;
create policy "ppt_file_self_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'ppt-file' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'ppt-file' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile_file_self_write" on storage.objects;
create policy "profile_file_self_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'profile-file' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-file' and (storage.foldername(name))[1] = auth.uid()::text);
