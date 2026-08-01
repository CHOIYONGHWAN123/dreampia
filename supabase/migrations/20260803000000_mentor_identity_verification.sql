-- 멘토 앱 회원가입 시 PortOne(구 아임포트) 기반 실명 본인인증(CI/DI) 결과를 기록한다.
--
-- PortOne 계정이 아직 없어(가입/심사 전) 실제 연동은 나중에 API 시크릿을
-- `supabase secrets set PORTONE_API_SECRET=...`으로 채워 넣으면 바로 동작하도록,
-- 스키마·트리거·Edge Function 골격을 미리 준비해둔다.
--
-- CI(연계정보)는 같은 실제 인물임을 식별하는 값이라, 이메일만 바꿔 중복 가입하는 것을
-- verify-identity Edge Function에서 사전에 걸러주지만, 동시 요청 등 경쟁 상황에 대비해
-- DB 레벨에도 유니크 인덱스로 방어선을 하나 더 둔다.

alter table public.mentors
  add column identity_verified_at timestamptz,
  add column identity_verification_ci varchar;

create unique index mentors_identity_verification_ci_key
  on public.mentors (identity_verification_ci)
  where identity_verification_ci is not null;

create or replace function public.handle_new_mentor_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mentors (
    id, name, phone, is_authenticated, terms_agreed_at, terms_version_id,
    identity_verified_at, identity_verification_ci
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', '미입력'),
    new.raw_user_meta_data->>'phone',
    false,
    now(),
    (new.raw_user_meta_data->>'terms_version_id')::uuid,
    case
      when new.raw_user_meta_data->>'identity_verification_ci' is not null then now()
      else null
    end,
    new.raw_user_meta_data->>'identity_verification_ci'
  );
  return new;
end;
$$;
