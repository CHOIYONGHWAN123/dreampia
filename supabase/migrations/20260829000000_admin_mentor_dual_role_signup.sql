-- 한 사람이 멘토와 관리자를 동시에 겸할 수 있도록 허용한다.
-- auth.users insert 트리거(on_admin_signup)는 계정(이메일)당 auth.users에 처음
-- INSERT될 때 딱 한 번만 실행되므로, 이미 멘토로 가입된 이메일이 관리자 웹에서
-- signUp()을 다시 호출해도 새 auth.users 행이 생기지 않아 트리거가 동작하지 않는다.
-- 그래서 관리자 웹 회원가입 페이지가 "이미 가입된 이메일로 로그인 성공 + admins 행 없음"을
-- 감지했을 때 셀프로 admins 행을 추가할 수 있도록 INSERT 정책을 별도로 둔다.
-- is_super/is_authenticated 등 권한 관련 컬럼은 반드시 안전한 기본값(false/null)일
-- 때만 허용해, 이 경로로 관리자 승인이나 슈퍼관리자 권한을 스스로 부여할 수 없게 막는다.
-- (멘토 웹에서 "기존 관리자가 멘토로도 가입"하는 반대 방향은 별도 저장소이므로,
--  동일한 패턴(본인 mentors 셀프 등록 INSERT 정책 + 안전한 기본값 체크)을 그쪽에서 추가해야 한다.)

create policy "본인 admins 셀프 등록(겸직)" on public.admins
  for insert
  with check (
    auth.uid() = id
    and is_super = false
    and is_authenticated = false
    and is_sales = false
    and is_comm = false
    and approved_by is null
    and approved_at is null
  );
