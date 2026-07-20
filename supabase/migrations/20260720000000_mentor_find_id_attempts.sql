-- 멘토 앱 "아이디(이메일) 찾기" 기능의 속도 제한/감사 로그용 테이블.
-- 이름+전화번호로 계정을 찾아 이메일로 인증번호를 보내는 흐름이라, 전화번호별로
-- 요청(request)/검증(verify) 시도 횟수를 제한해 열거·무차별 대입 공격을 막는다.
-- Edge Function(service_role)에서만 접근하므로 RLS는 켜두되 정책은 두지 않는다(기본 전체 거부).

create table if not exists public.mentor_find_id_attempts (
  id           uuid      primary key default gen_random_uuid(),
  phone_digits varchar   not null,
  action       varchar   not null check (action in ('request', 'verify')),
  created_at   timestamp not null default now()
);

create index if not exists mentor_find_id_attempts_lookup_idx
  on public.mentor_find_id_attempts(phone_digits, action, created_at);

alter table public.mentor_find_id_attempts enable row level security;
