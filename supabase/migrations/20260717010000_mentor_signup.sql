-- auth.users에 걸려있던 on_admin_signup 트리거는 계정 종류를 구분하지 않고
-- 무조건 admins에 행을 추가했다. 멘토 앱이 같은 프로젝트의 auth.users를 공유해서
-- 회원가입하게 되므로, 그대로 두면 멘토 회원가입 시에도 admins에 잘못 등록된다.
-- signUp() 호출 시 넘기는 raw_user_meta_data.account_type('admin' | 'mentor')으로
-- 트리거가 각자의 테이블에만 반응하도록 분리한다.

drop trigger if exists on_admin_signup on auth.users;

create trigger on_admin_signup
  after insert on auth.users
  for each row
  when (new.raw_user_meta_data->>'account_type' = 'admin')
  execute function public.handle_new_admin_signup();

create or replace function public.handle_new_mentor_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mentors (id, name, phone, is_authenticated, terms_agreed_at, terms_version_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', '미입력'),
    new.raw_user_meta_data->>'phone',
    false,
    now(),
    (new.raw_user_meta_data->>'terms_version_id')::uuid
  );
  return new;
end;
$$;

drop trigger if exists on_mentor_signup on auth.users;

create trigger on_mentor_signup
  after insert on auth.users
  for each row
  when (new.raw_user_meta_data->>'account_type' = 'mentor')
  execute function public.handle_new_mentor_signup();

-- ── RLS ──────────────────────────────────────────────────────────────
-- terms는 company_info와 마찬가지로 마이그레이션 이력 없이 생성되어 RLS가 꺼져 있었다.
-- 약관은 공개 정보이자 회원가입(비로그인) 중에도 보여줘야 하므로 조회는 누구나 가능하게 한다.

alter table public.terms enable row level security;

drop policy if exists "terms_select" on public.terms;
create policy "terms_select" on public.terms
  for select using (true);

drop policy if exists "terms_write" on public.terms;
create policy "terms_write" on public.terms
  for all using (public.is_authenticated_admin()) with check (public.is_authenticated_admin());

-- mentors는 이미 RLS가 켜져 있다(기존 정책 내용은 마이그레이션 이력이 없어 확인 불가하므로
-- 건드리지 않는다). 본인 행을 조회할 수 있는 정책만 추가로 얹는다 — 멘토 앱이 로그인 직후
-- 자신의 승인 상태(is_authenticated)를 읽어야 하기 때문이다.
drop policy if exists "mentors_self_select" on public.mentors;
create policy "mentors_self_select" on public.mentors
  for select using (id = auth.uid());
