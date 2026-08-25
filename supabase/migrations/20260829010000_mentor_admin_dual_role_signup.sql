-- 20260829000000_admin_mentor_dual_role_signup.sql(관리자 웹에서 멘토 겸직)의 반대 방향.
-- 이미 mentors로 가입된 이메일이 관리자 웹에서 signUp()을 호출해 admins를 겸직할 수 있게
-- 한 것과 마찬가지로, 이미 admins로 가입된 이메일이 멘토 웹에서 signUp()을 다시 호출해도
-- auth.users에 새 행이 생기지 않아 on_mentor_signup 트리거가 동작하지 않는다.
-- 멘토 웹 회원가입 화면이 "이미 가입된 이메일로 로그인 성공 + mentors 행 없음"을 감지했을 때
-- 셀프로 mentors 행을 추가할 수 있게 하는 정책이다. is_authenticated/score/belongs_to는
-- 반드시 안전한 기본값일 때만 허용해, 이 경로로 스스로 승인되거나 소속을 조작할 수 없게 막는다.
-- mentor_unique_code는 mentors_assign_unique_code 트리거가 채워주므로 이 정책에서는
-- 신경 쓰지 않아도 된다.

create policy "본인 mentors 셀프 등록(관리자 겸직)" on public.mentors
  for insert
  with check (
    auth.uid() = id
    and is_authenticated = false
    and score = 100
    and belongs_to is null
  );
